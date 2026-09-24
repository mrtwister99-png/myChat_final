const express = require('express');
const crypto = require('crypto');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { supabase, loadPersistedConfig } = require('./supabase');
const { classifyPin, getConfiguredPins, normalizePin, requiredEnv } = require('./pinRouter');

const PORT = Number(process.env.PORT || 8080);
const ANNOUNCEMENT_PREFIX = '[[ANNOUNCEMENT]]';
const MAX_MESSAGES_PER_CHAT = 200;
const ADMIN_SETUP_SECRET = requiredEnv('ADMIN_SETUP_SECRET');
const configuredPins = getConfiguredPins();

// FIX (NEJDULEZITEJSI): jakakoli chyba v async handleru (vypadek site,
// Supabase timeout) = unhandled rejection = Node cely proces zabije.
// Railway ho restartuje, RAM se vymaze -> uzivatel dostane nove ID i nove
// jmeno a zpravy zmizi. Presne to, co se delo.
process.on('unhandledRejection', (reason) => {
  console.log('!!! UNHANDLED REJECTION (server bezi dal):', reason?.stack || reason?.message || reason);
});

process.on('uncaughtException', (error) => {
  console.log('!!! UNCAUGHT EXCEPTION (server bezi dal):', error?.stack || error?.message || error);
});

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const state = {
  userPin: configuredPins.user,
  adminPin: configuredPins.admin,
  adminPw: '',
  destructiveMode: false,
  selfDeleteEnabled: true,
  selfDeleteDelayMs: 30 * 60 * 1000,
  adminStatus: 'off',
  adminProfile: {
    icon: 'admin',
    silhouetteColour: '#0b3d91',
    bgColour: '#ece9d8',
  },

  nextUserNumber: 1,

  users: [],

  chats: {},
  chatReadAtByUserId: {},
  selfDeleteTimers: {},

  mutedUsers: {},

  secretMutedUsers: {},

  adminConfig: {},
  ipHistory: [],
  kickedIps: {},
  pinAttemptsByIp: {},
  recoveryRequests: [],
  specialPins: {},
  activePins: {
    user: configuredPins.user,
    admin: configuredPins.admin,
  },

  userPinsById: {},
  kickedRoomUserIds: {},
  userProfilesById: {},

  pushTokensByUserId: {},
  adminPushTokens: new Set(),
  pushCooldowns: {},

  unlockedRatingUsers: {},
  userRatings: {},

  // FIX: klient posila wall:get / wall:post, server to drive vubec neznal
  wallMessage: null,

  // userId -> deviceId, kvuli obnove "online" po reconnectu
  deviceByUserId: {},

  // POVINNE POTVRZENI: room PIN vyzaduje schvaleni adminem - kazdy vstup musi cekat
  pendingRoomApprovals: {},
  approvedRoomDevices: {},
};

const WALL_MESSAGE_MAX_LENGTH = 100;
const DEVICE_BINDING_TIMEOUT_MS = 2 * 60 * 1000;

const SUPPORTED_AVATAR_ICONS = new Set([
  'uzivatel',
  'cat',
  'pes',
  'happy',
  'devil',
  'klaun',
  'stop',
  'prase',
  'fuckerr',
  'zachod',
]);

const SUPPORTED_ADMIN_ICONS = new Set([
  'admin',
  'admin1',
  'admin2',
  'admin3',
  'admin4',
  'admin5',
]);

const normalizeAvatarIcon = (icon) => {
  const cleanIcon = String(icon || '').trim().toLowerCase();

  if (cleanIcon === 'klan') {
    return 'klaun';
  }

  if (cleanIcon === 'fucker') {
    return 'fuckerr';
  }

  if (cleanIcon === 'vykricnik') {
    return 'prase';
  }

  return SUPPORTED_AVATAR_ICONS.has(cleanIcon) ? cleanIcon : 'uzivatel';
};

const normalizeAdminIcon = (icon) => {
  const cleanIcon = String(icon || '').trim().toLowerCase();
  return SUPPORTED_ADMIN_ICONS.has(cleanIcon) ? cleanIcon : 'admin';
};

const normalizeColour = (colour, fallback = '#0b3d91') => {
  const cleanColour = String(colour || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(cleanColour)? cleanColour : fallback;
};

const isValidDeviceId = (deviceId) => {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(deviceId || '').trim());
};

const getPublicAdminProfile = () => {
  const adminProfile = state.adminProfile || {};

  state.adminProfile = {
    icon: normalizeAdminIcon(adminProfile.icon),
    silhouetteColour: normalizeColour(adminProfile.silhouetteColour, '#0b3d91'),
    bgColour: normalizeColour(adminProfile.bgColour, '#ece9d8'),
  };

  return {
    ...state.adminProfile,
  };
};

const PUSH_COOLDOWN_MS = 5 * 60 * 1000;

const sendExpoPushAsync = async ({ to, title, body, data = {}, badge, channelId = 'chat-messages', sound = 'notification.caf', priority = 'high' }) => {
  if (!to) return;
  const tokens = Array.isArray(to) ? to : [to];
  if (tokens.length === 0) return;

  try {
    const messages = tokens.map((token) => ({
      to: token,
      ...(sound ? { sound } : {}),
      title: String(title || 'Nova zprava').slice(0, 120),
      body: String(body || '').slice(0, 240),
      data: {
        ...(data || {}),
        action: data?.action || 'openChat',
      },
      channelId,
      priority,
      categoryId: 'chat_reply',
      // cislo na ikonce kdyz je appka zavrena (iOS; Android pocita notifikace sam)
      ...(Number.isFinite(badge) ? { badge } : {}),
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json().catch(() => null);
    console.log('Expo push result:', result);
  } catch (e) {
    console.log('Expo push error:', e?.message || e);
  }
};

// FIX: supabase dotaz NENI Promise, je to jen "thenable" - nema .catch().
// Volani .catch(() => {}) proto hodilo TypeError a shodilo cely server.
// Tenhle helper dotaz bezpecne odpali a chybu jen zaloguje.
const fireAndForget = (query, label = 'supabase') => {
  Promise.resolve(query).then(
    (result) => {
      if (result?.error) {
        console.log(`${label} chyba:`, result.error.message || result.error);
      }
    },
    (error) => {
      console.log(`${label} selhalo:`, error?.message || error);
    }
  );
};

async function savePushTokenToSupabase({ userId, deviceId, token, role }) {
  if (!supabase) return;
  // FIX: bez try/catch shodil vypadek site cely server
  try {
    await supabase.from('push_tokens').upsert({
      device_id: deviceId,
      user_id: userId || 'admin',
      expo_token: token,
      role,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'device_id' });
  } catch (error) {
    console.log('push_tokens zapis preskocen:', error?.message || error);
  }
}

async function getPushTokenForUserId(userId) {
  if (supabase) {
    try {
      const { data } = await supabase
        .from('push_tokens')
        .select('expo_token')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (data?.[0]?.expo_token) return data[0].expo_token;
    } catch (error) {
      console.log('push_tokens cteni preskoceno:', error?.message || error);
    }
  }
  return state.pushTokensByUserId[userId] || null;
}

const shouldSendPushWithCooldown = (key) => {
  const now = Date.now();
  const last = state.pushCooldowns[key] || 0;
  if (now - last < PUSH_COOLDOWN_MS) return false;
  state.pushCooldowns[key] = now;
  return true;
};

const RANDOM_USER_NAMES = [
  'Jiří', 'Jan', 'Petr', 'Josef', 'Pavel', 'Martin', 'Tomáš', 'Jaroslav', 'Miroslav', 'Zdeněk',
  'Václav', 'Michal', 'František', 'Jakub', 'Milan', 'Karel', 'Lukáš', 'David', 'Vladimír', 'Ondřej',
  'Ladislav', 'Roman', 'Marek', 'Stanislav', 'Daniel', 'Radek', 'Antonín', 'Vojtěch', 'Filip', 'Adam',
  'Matěj', 'Dominik', 'Aleš', 'Miloslav', 'Jaromír', 'Patrik', 'Libor', 'Jindřich', 'Vlastimil', 'Miloš',
  'Lubomír', 'Štěpán', 'Oldřich', 'Rudolf', 'Matyáš', 'Ivan', 'Robert', 'Luboš', 'Radim', 'Richard',
  'Vít', 'Bohumil', 'Šimon', 'Rostislav', 'Ivo', 'Luděk', 'Dušan', 'Kamil', 'Michael', 'Vladislav',
  'Zbyněk', 'Viktor', 'Bohuslav', 'Kryštof', 'Alois', 'René', 'Vítězslav', 'Tadeáš', 'Štefan', 'Eduard',
  'Marcel', 'Jan', 'Jozef', 'Samuel', 'Dalibor', 'Emil', 'Radomír', 'Ludvík', 'Denis', 'Vilém',
  'Tobiáš', 'Jana', 'Marie', 'Eva', 'Hana', 'Anna', 'Lenka', 'Kateřina', 'Lucie', 'Věra',
  'Alena', 'Petra', 'Veronika', 'Jaroslava', 'Tereza', 'Martina', 'Michaela', 'Jitka', 'Helena', 'Ludmila',
  'Zdeňka', 'Ivana', 'Monika', 'Eliška', 'Zuzana', 'Markéta', 'Jarmila', 'Barbora', 'Jiřina', 'Marcela',
  'Kristýna', 'Dana', 'Dagmar', 'Adéla', 'Pavla', 'Vlasta', 'Miroslava', 'Andrea', 'Irena', 'Božena',
  'Klára', 'Libuše', 'Marta', 'Šárka', 'Nikola', 'Karolína', 'Iveta', 'Pavlína', 'Natálie', 'Olga',
  'Blanka', 'Gabriela', 'Renata', 'Aneta', 'Simona', 'Růžena', 'Radka', 'Daniela', 'Denisa', 'Iva',
  'Milada', 'Milena', 'Romana', 'Miloslava', 'Miluše', 'Ilona', 'Anežka', 'Soňa', 'Kamila', 'Stanislava',
  'Nela', 'Vladimíra', 'Naděžda', 'Květoslava', 'Danuse', 'Vendula', 'Drahomíra', 'Julie', 'Jindřiška', 'Emilie',
  'Viktorie',
];

const pickRandomUserName = () => {
  const baseName = RANDOM_USER_NAMES[Math.floor(Math.random() * RANDOM_USER_NAMES.length)] || 'Uzivatel';
  const usedNames = new Set(state.users.map((user) => user.name));

  if (!usedNames.has(baseName)) {
    return baseName;
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.floor(Math.random() * 90) + 10;
    const candidate = `${baseName} ${suffix}`;

    if (!usedNames.has(candidate)) {
      return candidate;
    }
  }

  return `${baseName} ${state.nextUserNumber}`;
};

const isPlaceholderUserName = (name) => {
  const cleanName = String(name || '').trim().toLowerCase();

  if (!cleanName) {
    return true;
  }

  if (/^uzivatel\s*\d*$/.test(cleanName)) {
    return true;
  }

  if (/^host\s*\d+$/.test(cleanName)) {
    return true;
  }

  return false;
};

const ensureRandomNameForUser = (userId) => {
  const existing = getUserById(userId);

  if (!existing || !isPlaceholderUserName(existing.name)) {
    return existing;
  }

  const nextName = pickRandomUserName();

  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          name: nextName,
        }
      : user
  );

  return getUserById(userId);
};

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getClientIp = (socket) => {
  const forwarded = socket?.handshake?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }

  const remoteAddress = socket?.handshake?.address || socket?.request?.connection?.remoteAddress || 'unknown';
  return String(remoteAddress).replace('::ffff:', '').trim() || 'unknown';
};

const generateRandomTime = (index) => {
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  const patterns = [
    { offsetMs: 12 * 60 * 1000, label: 'před 12 min' },
    { offsetMs: 36 * 60 * 1000, label: 'před 36 min' },
    { offsetMs: 1.5 * hourMs, label: 'před 1 h 30 min' },
    { offsetMs: 3 * hourMs, label: 'před 3 h' },
    { offsetMs: 7 * hourMs, label: 'před 7 h' },
    { offsetMs: 19 * hourMs, label: 'před 19 h' },
    { offsetMs: 1.2 * dayMs, label: 'před 1 den' },
    { offsetMs: 2.4 * dayMs, label: 'před 2 dny' },
    { offsetMs: 4.2 * dayMs, label: 'před 4 dny' },
    { offsetMs: 7 * dayMs, label: 'před 7 dní' },
    { offsetMs: 12 * dayMs, label: 'před 12 dní' },
  ];

  const chosen = patterns[(index + 1) % patterns.length] || patterns[0];
  const lastSeenAt = Date.now() - chosen.offsetMs;

  return {
    lastSeenAt,
    lastActive: chosen.label,
  };
};

const getTrustedDevice = async (deviceId) => {
  if (!supabase || !deviceId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (error) {
      console.log('trusted_devices lookup skipped:', error.message);
      return null;
    }

    return data || null;
  } catch (error) {
    console.log('trusted_devices lookup selhal:', error?.message || error);
    return null;
  }
};

const hasTrustedDevices = async () => {
  if (!supabase) {
    return false;
  }

  const { count, error } = await supabase
    .from('trusted_devices')
    .select('device_id', { count: 'exact', head: true });

  if (error) {
    return false;
  }

  return Number(count || 0) > 0;
};

const registerTrustedDevice = async ({ deviceId, ip, email }) => {
  if (!supabase || !deviceId) {
    return;
  }

  try {
    await supabase.from('trusted_devices').upsert({
      device_id: deviceId,
      first_ip: ip,
      email: email || null,
      last_seen: new Date().toISOString(),
      is_trusted: true,
      badge: 'DŮVĚRYHODNÝ',
    }, { onConflict: 'device_id' });
  } catch (error) {
    console.log('trusted_devices zapis preskocen:', error?.message || error);
  }
};

const expireSpecialPins = async () => {
  if (!supabase) {
    return;
  }

  try {
    await supabase
      .from('special_pins')
      .update({ is_active: false })
      .eq('is_active', true)
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.log('expirace special pinu preskocena:', error?.message || error);
  }
};

const isValidSpecialPin = async ({ userId, pin, deviceId }) => {
  if (!supabase || !userId || !pin) {
    return false;
  }

  try {
  const { data, error } = await supabase
    .from('special_pins')
    .select('pin, device_id, expires_at, is_active, use_count')
    .eq('user_id', userId)
    .eq('pin', pin)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  if (data.device_id && data.device_id !== deviceId) {
    return false;
  }

  const nextUseCount = Number(data.use_count || 0) + 1;
  await supabase.from('special_pins').update({
    use_count: nextUseCount,
    is_active: nextUseCount < 1,
  }).eq('user_id', userId).eq('pin', pin);

  return true;
  } catch (error) {
    console.log('kontrola special pinu selhala:', error?.message || error);
    return false;
  }
};

const addIpHistory = async ({ socket, type, reason = '', userId = null }) => {
  const cleanIp = getClientIp(socket);

  if (!cleanIp || cleanIp === 'unknown') {
    return;
  }

  const entry = {
    id: createMessageId(),
    ip: cleanIp,
    type,
    reason,
    userId,
    createdAt: Date.now(),
  };

  state.ipHistory = [...state.ipHistory.slice(-999), entry];

  if (supabase) {
    try {
      await supabase.from('ip_history').insert(entry);
    } catch (error) {
      console.log('ip_history sync skipped:', error?.message || error);
    }
  }
};

const getPinLockState = (socket) => {
  const ip = getClientIp(socket);
  const current = state.pinAttemptsByIp[ip] || { attempts: 0, blockedUntil: 0 };

  if (current.blockedUntil && current.blockedUntil <= Date.now()) {
    delete state.pinAttemptsByIp[ip];
    return { ip, attempts: 0, blockedUntil: 0 };
  }

  return { ip, ...current };
};

const recordPinFailure = (socket) => {
  const { ip, attempts } = getPinLockState(socket);
  const nextAttempts = attempts + 1;
  const blockedUntil = nextAttempts >= 5 ? Date.now() + (15 * 60 * 1000) : 0;

  state.pinAttemptsByIp[ip] = {
    attempts: nextAttempts,
    blockedUntil,
  };

  return state.pinAttemptsByIp[ip];
};

const clearPinFailures = (socket) => {
  delete state.pinAttemptsByIp[getClientIp(socket)];
};

const syncActivePinsToSupabase = async () => {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from('active_pins').upsert([
      { type: 'user', pin: state.userPin },
      { type: 'admin', pin: state.adminPin },
    ], { onConflict: 'type' });
  } catch (error) {
    console.log('active_pins sync skipped:', error?.message || error);
  }
};

const syncAdminConfigToSupabase = async () => {
  if (!supabase) {
    return;
  }

  try {
    await supabase.from('admin_config').upsert([
      {
        key: 'recovery_password',
        value: state.adminPw || '',
      },
    ], { onConflict: 'key' });
  } catch (error) {
    console.log('admin_config sync skipped:', error?.message || error);
  }
};

// FIX: profily uzivatelu (jmeno, barvy, ikonka) se drzely jen v RAM.
// Po kazdem restartu serveru se vygenerovalo nove nahodne jmeno.
// Ukladame je jako JSON do admin_config, zadna zmena schematu netreba.
let persistProfilesTimer = null;

const persistUserProfiles = () => {
  if (!supabase || persistProfilesTimer) {
    return;
  }

  persistProfilesTimer = setTimeout(async () => {
    persistProfilesTimer = null;
    try {
      await supabase.from('admin_config').upsert({
        key: 'user_profiles',
        value: JSON.stringify(state.userProfilesById),
      }, { onConflict: 'key' });
    } catch (error) {
      console.log('ulozeni profilu preskoceno:', error?.message || error);
    }
  }, 5000);
};

const hydratePersistedConfig = async () => {
  if (!supabase) {
    return;
  }

  try {
    const persisted = await loadPersistedConfig();
    const pinByType = Object.fromEntries(persisted.pins.map((item) => [item.type, item.pin]));
    const configByKey = Object.fromEntries(persisted.config.map((item) => [item.key, item.value]));

    state.userPin = pinByType.user || state.userPin;
    state.adminPin = pinByType.admin || state.adminPin;
    state.adminPw = configByKey.recovery_password || state.adminPw;
    state.activePins.user = state.userPin;
    state.activePins.admin = state.adminPin;
    state.kickedIps = Object.fromEntries(
      persisted.kickedIps.map((item) => [item.ip, {
        reason: item.reason || '',
        createdAt: item.created_at || Date.now(),
      }])
    );
    state.recoveryRequests = persisted.recoveryRequests;
    state.specialPins = Object.fromEntries(
      persisted.specialPins.map((item) => [item.user_id, item.pin])
    );
    state.userPinsById = { ...state.userPinsById, ...state.specialPins };
    try {
      const { data: pushTokens } = await supabase.from('push_tokens').select('user_id, expo_token, role');
      if (Array.isArray(pushTokens)) {
        pushTokens.forEach((row) => {
          if (row.role === 'admin' && row.expo_token) {
            state.adminPushTokens.add(row.expo_token);
          }
          if (row.role === 'user' && row.user_id && row.expo_token) {
            state.pushTokensByUserId[row.user_id] = row.expo_token;
          }
        });
      }
    } catch {}

    // FIX: obnova historie chatu z DB. Driv se po restartu serveru vsechno
    // vymazalo z RAM a uzivatel dostal cisty chat i nove ID.
    try {
      const { data: savedMessages } = await supabase
        .from('messages')
        .select('id, user_id, sender, text, created_at, self_destruct')
        .order('created_at', { ascending: true })
        .limit(5000);

      if (Array.isArray(savedMessages)) {
        const restoredChats = {};

        savedMessages.forEach((row) => {
          const chatId = String(row.user_id || '').trim();

          if (!chatId) {
            return;
          }

          if (!restoredChats[chatId]) {
            restoredChats[chatId] = [];
          }

          restoredChats[chatId].push({
            id: String(row.id),
            sender: row.sender,
            text: row.text,
            createdAt: Number(row.created_at) || Date.now(),
            selfDestruct: Boolean(row.self_destruct),
          });
        });

        Object.keys(restoredChats).forEach((chatId) => {
          state.chats[chatId] = restoredChats[chatId].slice(-MAX_MESSAGES_PER_CHAT);
        });

        console.log(`Obnoveno ${Object.keys(restoredChats).length} chatu z databaze.`);
      }
    } catch (error) {
      console.log('obnova chatu preskocena:', error?.message || error);
    }

    // obnova profilu uzivatelu
    try {
      const parsedProfiles = configByKey.user_profiles
        ? JSON.parse(configByKey.user_profiles)
        : null;

      if (parsedProfiles && typeof parsedProfiles === 'object') {
        state.userProfilesById = { ...parsedProfiles, ...state.userProfilesById };
        console.log(`Obnoveno ${Object.keys(parsedProfiles).length} profilu uzivatelu.`);
      }
    } catch (error) {
      console.log('obnova profilu preskocena:', error?.message || error);
    }

    // FIX: cislovani ID musi navazat, jinak se po restartu zacne zase od "1"
    // a novy clovek prevezme cizi chat
    const knownIds = [
      ...Object.keys(state.chats),
      ...Object.keys(state.userProfilesById),
    ]
      .map((id) => Number.parseInt(id, 10))
      .filter((value) => Number.isFinite(value));

    if (knownIds.length > 0) {
      state.nextUserNumber = Math.max(state.nextUserNumber, Math.max(...knownIds) + 1);
      console.log(`Dalsi userId bude ${state.nextUserNumber}.`);
    }
  } catch (error) {
    console.log('Supabase config load skipped:', error?.message || error);
  }
};

const getPublicUsers = () => {
  return state.users.map((user) => ({
    id: user.id,
    name: user.name,
    silhouetteColour: user.silhouetteColour,
    bgColour: user.bgColour,
    avatarIcon: normalizeAvatarIcon(user.avatarIcon),
    avatarLocked: Boolean(user.avatarLocked),
    colour: user.silhouetteColour,
    online: user.online,
    lastSeenAt: user.lastSeenAt,
    deviceFingerprint: user.deviceFingerprint || null,
    deviceModel: user.deviceModel || null,
    trustedDevice: Boolean(user.trustedDevice),
    trustedDeviceBadge: user.trustedDeviceBadge || null,
  }));
};

// BEZPECNOST: server:state se posila i socketu, ktery jeste nezadal PIN.
// Driv byl uvnitr i userPin/activePins - kdokoli se pripojil, precetl si PIN
// do roomky. Citliva pole proto dostane jen prihlaseny admin.
const getPublicState = (isAdmin = true) => {
  const normalizedSecretMutedUsers = Object.fromEntries(
    Object.entries(state.secretMutedUsers || {}).filter(([, value]) => Boolean(value))
  );

  state.secretMutedUsers = normalizedSecretMutedUsers;

  const commonState = {
    adminStatus: state.adminStatus,
    destructiveMode: state.destructiveMode,
    selfDeleteEnabled: state.selfDeleteEnabled,
    selfDeleteDelayMs: state.selfDeleteDelayMs,
    adminProfile: getPublicAdminProfile(),
    users: getPublicUsers(),
    mutedUsers: state.mutedUsers,
    secretMutedUsers: normalizedSecretMutedUsers,
    unlockedRatingUsers: state.unlockedRatingUsers,
    userRatings: state.userRatings,
  };

  if (!isAdmin) {
    return commonState;
  }

  return {
    ...commonState,
    userPin: state.userPin,
    adminConfig: state.adminConfig,
    recoveryRequests: state.recoveryRequests,
    kickedIps: state.kickedIps,
  };
};

const rememberUserProfile = (user) => {
  if (!user || !user.id) {
    return;
  }

  const cleanUserId = String(user.id);

  state.userProfilesById[cleanUserId] = {
    name: user.name,
    silhouetteColour: user.silhouetteColour,
    bgColour: user.bgColour,
    avatarIcon: normalizeAvatarIcon(user.avatarIcon),
    avatarLocked: Boolean(user.avatarLocked),
  };

  persistUserProfiles();
};

const getStoredUserProfile = (userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return null;
  }

  return state.userProfilesById[cleanUserId] || null;
};

const patchStoredUserProfile = (userId, patch) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId || !patch || typeof patch !== 'object') {
    return;
  }

  const existing = state.userProfilesById[cleanUserId] || {
    name: pickRandomUserName(),
    silhouetteColour: '#0b3d91',
    bgColour: '#ece9d8',
    avatarIcon: 'uzivatel',
    avatarLocked: false,
  };

  state.userProfilesById[cleanUserId] = {
    ...existing,
    ...patch,
    avatarIcon: normalizeAvatarIcon(patch.avatarIcon || existing.avatarIcon),
    avatarLocked:
      typeof patch.avatarLocked === 'boolean'
        ? patch.avatarLocked
        : Boolean(existing.avatarLocked),
  };

  persistUserProfiles();
};

const clearRoomKickReuseBlock = (userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return;
  }

  delete state.kickedRoomUserIds[cleanUserId];
};

const emitState = () => {
  io.to('admins').emit('server:state', getPublicState(true));
  io.except('admins').emit('server:state', getPublicState(false));
};

const ensureChatForUser = (user) => {
  if (!state.chats[user.id]) {
    state.chats[user.id] = [];
  }
};

const createUserForSocket = (socket) => {
  const userId = String(state.nextUserNumber);
  const userName = pickRandomUserName();

  state.nextUserNumber += 1;

  const user = {
    id: userId,
    name: userName,
    silhouetteColour: '#0b3d91',
    bgColour: '#ece9d8',
    avatarIcon: 'uzivatel',
    avatarLocked: false,
    online: true,
    lastSeenAt: Date.now(),
    socketId: socket.id,
    deviceFingerprint: socket.data.deviceFingerprint || socket.data.deviceId || null,
    deviceModel: socket.data.deviceModel || null,
    trustedDevice: Boolean(socket.data.trustedDevice),
    trustedDeviceBadge: socket.data.trustedDeviceBadge || null,
   };

  state.users.push(user);
  rememberUserProfile(user);

  socket.data.role = 'user';
  socket.data.userId = user.id;

  socket.join('users');
  socket.join(`user:${user.id}`);

  ensureChatForUser(user);

  return user;
};

const createTestUser = () => {
  const userId = `test_${Date.now()}`;
  const user = {
    id: userId,
    name: `Test ${pickRandomUserName()}`,
    silhouetteColour: '#0b3d91',
    bgColour: '#ece9d8',
    avatarIcon: 'uzivatel',
    avatarLocked: false,
    online: false,
    lastSeenAt: Date.now(),
    socketId: null,
  };

  state.users.push(user);
  rememberUserProfile(user);
  ensureChatForUser(user);
  return user;
};

const createUserWithKnownIdForSocket = (socket, userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return null;
  }

  const profile = getStoredUserProfile(cleanUserId);
  const nextName = !isPlaceholderUserName(profile?.name)
    ? profile.name
    : pickRandomUserName();

  const user = {
    id: cleanUserId,
    name: nextName,
    silhouetteColour: profile?.silhouetteColour || '#0b3d91',
    bgColour: profile?.bgColour || '#ece9d8',
    avatarIcon: normalizeAvatarIcon(profile?.avatarIcon),
    avatarLocked: Boolean(profile?.avatarLocked),
    online: true,
    lastSeenAt: Date.now(),
    socketId: socket.id,
    deviceFingerprint: socket.data.deviceFingerprint || socket.data.deviceId || null,
    deviceModel: socket.data.deviceModel || null,
    trustedDevice: Boolean(socket.data.trustedDevice),
    trustedDeviceBadge: socket.data.trustedDeviceBadge || null,
  };

  state.users.push(user);
  rememberUserProfile(user);

  const numericUserId = Number.parseInt(cleanUserId, 10);
  if (Number.isFinite(numericUserId) && numericUserId >= state.nextUserNumber) {
    state.nextUserNumber = numericUserId + 1;
  }

  socket.data.role = 'user';
  socket.data.userId = user.id;

  socket.join('users');
  socket.join(`user:${user.id}`);

  ensureChatForUser(user);

  return user;
};

const getUserById = (userId) => {
  return state.users.find((user) => user.id === userId);
};

const syncSocketUserSession = (socket, expectedUserId) => {
  const cleanExpectedUserId = String(expectedUserId || '').trim();

  if (!cleanExpectedUserId) {
    return false;
  }

  const currentSocketUserId = socket.data.userId ? String(socket.data.userId).trim() : '';
  const lastKnownUserId = socket.data.lastUserId ? String(socket.data.lastUserId).trim() : '';

  if (currentSocketUserId && currentSocketUserId !== cleanExpectedUserId) {
    return false;
  }

  if (!currentSocketUserId && (lastKnownUserId === cleanExpectedUserId || !lastKnownUserId)) {
    socket.data.role = 'user';
    socket.data.userId = cleanExpectedUserId;
    socket.data.lastUserId = cleanExpectedUserId;
    socket.join('users');
    socket.join(`user:${cleanExpectedUserId}`);
    return true;
  }

  return socket.data.role === 'user' && socket.data.userId === cleanExpectedUserId;
};

const markUserOnline = (userId, socket) => {
  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          online: true,
          lastSeenAt: Date.now(),
          socketId: socket.id,
          deviceFingerprint: socket.data.deviceFingerprint || socket.data.deviceId || null,
          deviceModel: socket.data.deviceModel || null,
          trustedDevice: Boolean(socket.data.trustedDevice),
          trustedDeviceBadge: socket.data.trustedDeviceBadge || null,
        }
      : user
  );

  socket.data.role = 'user';
  socket.data.userId = userId;
  socket.data.lastUserId = userId;

  socket.join('users');
  socket.join(`user:${userId}`);

  // zapamatovat, ze tenhle uzivatel patri tomuhle zarizeni (SecureStore deviceId)
  if (socket.data.deviceId) {
    state.deviceByUserId[String(userId)] = {
      deviceId: String(socket.data.deviceId),
      lastSeenAt: Date.now(),
    };
  }

  const currentUser = getUserById(userId);
  rememberUserProfile(currentUser);
};

const expireDeviceBindings = () => {
  const now = Date.now();
  const cutoff = now - DEVICE_BINDING_TIMEOUT_MS;

  Object.entries(state.deviceByUserId).forEach(([userId, binding]) => {
    const lastSeenAt = typeof binding === 'object' ? binding.lastSeenAt : 0;
    const user = getUserById(userId);
    const activeSocket = user?.online && user.socketId ? io?.sockets?.sockets?.get(user.socketId) : null;

    if (activeSocket?.connected && typeof binding === 'object') {
      binding.lastSeenAt = now;
      return;
    }

    if (!lastSeenAt || lastSeenAt < cutoff) {
      delete state.deviceByUserId[userId];
    }
  });
};

setInterval(expireDeviceBindings, 30 * 1000);

const markUserOfflineBySocket = (socket) => {
  const userId = socket.data.userId;

  if (!userId) {
    return;
  }

  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          online: false,
          lastSeenAt: Date.now(),
          socketId: null,
        }
      : user
  );
};

const removeUserById = (userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return;
  }

  state.users = state.users.filter((user) => user.id !== cleanUserId);
  delete state.chats[cleanUserId];
  delete state.mutedUsers[cleanUserId];
  delete state.secretMutedUsers[cleanUserId];
  delete state.userPinsById[cleanUserId];
  delete state.unlockedRatingUsers[cleanUserId];
  delete state.userRatings[cleanUserId];
};

const kickUser = (userId, reason = 'Byl jsi vyhozen z roomky.') => {
  const cleanUserId = String(userId || '').trim();
  const user = getUserById(cleanUserId);

  if (!user) {
    return;
  }

  rememberUserProfile(user);
  const specialPin = state.userPinsById[cleanUserId] || null;

  io.to(`user:${cleanUserId}`).emit('user:kicked', {
    userId: cleanUserId,
    reason,
    preserveIdentity: Boolean(specialPin),
    specialPin,
  });

  state.users = state.users.filter((item) => item.id !== cleanUserId);

  // vykopnuty uz se nesmi "vratit" pres client:ready
  delete state.deviceByUserId[cleanUserId];
  delete state.mutedUsers[cleanUserId];
  delete state.secretMutedUsers[cleanUserId];

  if (!specialPin) {
    delete state.userPinsById[cleanUserId];
  }

  emitState();
};

const kickAllUsers = (reason = 'Roomka byla změněna. Přihlaš se znovu.') => {
  io.to('users').emit('room:kicked', {
    reason,
  });

   io.to('admins').emit('room:hardReset',  {
    reason,
    timestamp: Date.now(),
  });
  state.users = [];
  state.chats = {};
  state.mutedUsers = {};
  state.secretMutedUsers = {};
  state.specialPins = {};
  state.userPinsById = {};
  state.userProfilesById = {};
  state.kickedRoomUserIds = {};
  state.nextUserNumber = 1;
  state.deviceByUserId = {};

  // FIX: hard reset musi smazat i to, co se po restartu obnovuje z DB,
  // jinak by se stare chaty vratily a srazily s novymi ID od 1
  if (supabase) {
    fireAndForget(supabase.from('messages').delete().neq('id', ''), 'hard reset messages');
    fireAndForget(supabase.from('special_pins').delete().neq('user_id', ''), 'hard reset special pins');
    fireAndForget(
      supabase.from('admin_config').upsert({ key: 'user_profiles', value: '{}' }, { onConflict: 'key' }),
      'hard reset profily'
    );
  }
  state.pushCooldowns = {};
  state.chatReadAtByUserId = {};
  state.unlockedRatingUsers = {};
  state.userRatings = {};
  emitState();
};

const changeRoomPassword = async (newPassword) => {
  const cleanPassword = normalizePin(newPassword);

  if (cleanPassword.length !== 5) {
    throw new Error('Nové heslo roomky musí mít 5 číslic.');
  }

  state.userPin = cleanPassword;
  state.activePins.user = cleanPassword;
  const { error } = await supabase.from('active_pins').upsert(
    { type: 'user', pin: cleanPassword },
    { onConflict: 'type' }
  );
  if (error) {
    throw error;
  }
  kickAllUsers('PIN roomky byl změněn. Přihlaš se znovu.');
};

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Chat-XP server jede!',
    users: getPublicUsers(),
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('server:state', getPublicState(socket.data.role === 'admin'));

  socket.on('client:ready', ({ lastUserId, deviceId }) => {
    expireDeviceBindings();
    const cleanLastId = String(lastUserId || '').trim();
    const cleanDeviceId = String(deviceId || '').trim();

    if (!cleanLastId) {
      return;
    }

    socket.data.lastUserId = cleanLastId;
    if (cleanDeviceId) {
      socket.data.deviceId = cleanDeviceId;
      socket.join(`device:${cleanDeviceId}`);
    }

    // FIX: uzivatel se po reconnectu (appka na pozadi, vypadek site) ukazoval
    // jako offline, dokud nenapsal zpravu. Kdyz stejne zarizeni hlasi stejne
    // userId, session hned obnovime a oznacime online.
    const knownBinding = state.deviceByUserId[cleanLastId];
    const knownDeviceId = typeof knownBinding === 'object' ? knownBinding.deviceId : knownBinding;
    const existingUser = getUserById(cleanLastId);

    if (
      cleanDeviceId &&
      knownDeviceId === cleanDeviceId &&
      existingUser &&
      !socket.data.userId &&
      socket.data.role !== 'admin' &&
      !state.kickedIps[getClientIp(socket)]
    ) {
      markUserOnline(cleanLastId, socket);
      emitState();
    }

    const pendingRecovery = state.recoveryRequests.find((item) =>
      String(item.user_id || item.userId || '') === cleanLastId &&
      item.status === 'answered' &&
      item.response_text
    );
    if (pendingRecovery) {
      socket.emit('recovery:message', {
        requestId: pendingRecovery.id,
        message: pendingRecovery.response_text,
      });
    }
  });

  socket.on('auth:attempt', async ({ pin, lastUserId, deviceId, deviceFingerprint, deviceModel, email, chosenName }) => {
    addIpHistory({ socket, type: 'pin_check', userId: lastUserId || socket.data.userId || null });
    const lockState = getPinLockState(socket);

    if (lockState.blockedUntil > Date.now()) {
      socket.emit('auth:error', {
        code: 'PIN_BLOCKED',
        blockedUntil: lockState.blockedUntil,
        message: 'PIN je zablokovaný na 15 minut.',
      });
      return;
    }

       const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 5);
    const cleanLastId = String(lastUserId || socket.data.lastUserId || '').trim();
    const rawDeviceId = String(deviceId || '').trim();
    const cleanDeviceId = isValidDeviceId(rawDeviceId)? rawDeviceId : '';
    const cleanChosenName = String(chosenName || 'Pavel').trim().slice(0, 40) || 'Pavel';
    const cleanDeviceFingerprint = String(deviceFingerprint || cleanDeviceId || '').trim().slice(0, 200);
    const cleanDeviceModel = String(deviceModel || '').trim().slice(0, 120);
    const currentIp = getClientIp(socket);
    const pinDecision = classifyPin(cleanPin, state.activePins);

    if (cleanDeviceId) {
      // FIX: deviceId si drzime primo na socketu - bez toho pozdejsi
      // notifications:registerToken bez deviceId spadne do early-returnu
      // a push token se nikdy neulozi.
      socket.data.deviceId = cleanDeviceId;
      socket.join(`device:${cleanDeviceId}`);
    }

    socket.data.deviceFingerprint = cleanDeviceFingerprint || cleanDeviceId || null;
    socket.data.deviceModel = cleanDeviceModel || null;

    if (pinDecision.kind === 'honey') {
      if (supabase) {
        try {
          await supabase.from('honey_attempts').insert({
            ip: currentIp,
            device_id: cleanDeviceId || null,
            tried_pin: cleanPin,
          });
        } catch (error) {
          console.log('honey_attempts zapis preskocen:', error?.message || error);
        }
      }

      io.to('admins').emit('honey:alert', {
        ip: currentIp,
        deviceId: cleanDeviceId || null,
        at: new Date().toISOString(),
      });

      socket.emit('auth:error', {
        code: 'INVALID_PIN',
        message: 'Špatný PIN.',
      });
      return;
    }

    if (pinDecision.kind === 'duress') {
      if (supabase) {
        try {
          await Promise.all([
            supabase.from('special_pins').update({ is_active: false }).eq('is_active', true),
            supabase.from('kicked_ips').update({ is_active: false }).eq('is_active', true),
            supabase.from('trusted_devices').update({ is_trusted: false, badge: 'NEOVĚŘENÝ' }).eq('is_trusted', true),
          ]);
        } catch (error) {
          console.log('duress wipe castecne selhal:', error?.message || error);
        }
      }

      const fakeUsers = Array.from({ length: 11 }, (_, index) => {
        const generated = generateRandomTime(index);

        return {
          id: `fake_${index}`,
          name: `User${index + 1}`,
          online: false,
          lastSeenAt: generated.lastSeenAt,
          lastActive: generated.lastActive,
        };
      });

      if (fakeUsers[0]) {
        fakeUsers[0] = {
          ...fakeUsers[0],
          name: 'User1',
          online: false,
          lastSeenAt: Date.now() - 10 * 60 * 1000,
          lastActive: 'před 10 min',
          lastMessageText: 'Tak čau ... :(',
        };
      }

      io.to('admins').emit('duress:triggered', {
        ip: currentIp,
        at: new Date().toISOString(),
      });

      socket.emit('auth:error', {
        code: 'INVALID_PIN',
        message: 'Špatný PIN.',
      });
      return;
    }

    const trustedDevice = await getTrustedDevice(cleanDeviceId);
    const isTrustedDevice = Boolean(trustedDevice?.is_trusted && !trustedDevice?.is_pending);
    socket.data.trustedDevice = isTrustedDevice;
    socket.data.trustedDeviceBadge = isTrustedDevice ? (trustedDevice.badge || 'DŮVĚRYHODNÝ') : (trustedDevice?.badge || 'ČEKÁ NA SCHVÁLENÍ');
    const isSpecialPinCandidate = Boolean(
      cleanLastId && state.userPinsById[cleanLastId] === cleanPin
    ) || await isValidSpecialPin({
      userId: cleanLastId,
      pin: cleanPin,
      deviceId: cleanDeviceId,
    });

       if (isSpecialPinCandidate && cleanDeviceId && (!trustedDevice || isTrustedDevice)) {
      await registerTrustedDevice({ deviceId: cleanDeviceId, ip: currentIp, email });
    }
    const specialPinForLastId = cleanLastId? state.userPinsById[cleanLastId] : null;
    const isSpecialPinLogin = Boolean(
      cleanLastId && (
        (specialPinForLastId && cleanPin === specialPinForLastId) ||
        isSpecialPinCandidate
      )
    );
    const isRoomPinLogin = pinDecision.kind === 'user';

        // POVINNÉ POTVRZENÍ: uživatel po zadání hesla NESMÍ rovnou do místnosti, musí čekat na potvrzení adminem
    if (isRoomPinLogin &&!isSpecialPinLogin) {
      const effectiveDeviceId = cleanDeviceId || cleanDeviceFingerprint || socket.id;
      const approvalKey = effectiveDeviceId;
      const approvedUntil = state.approvedRoomDevices[approvalKey] || state.approvedRoomDevices[cleanDeviceId] || state.approvedRoomDevices[socket.id] || 0;
      const isRecentlyApproved = approvedUntil > Date.now();

      if (!isRecentlyApproved) {
        state.pendingRoomApprovals[approvalKey] = {
          deviceId: effectiveDeviceId,
          fingerprint: cleanDeviceFingerprint || cleanDeviceId || effectiveDeviceId,
          model: cleanDeviceModel || 'Neznámé zařízení',
          name: cleanChosenName,
          ip: currentIp,
          time: Date.now(),
          socketId: socket.id,
          originalDeviceId: cleanDeviceId || null,
        };

        if (supabase &&!trustedDevice && cleanDeviceId) {
          try {
            await supabase.from('trusted_devices').upsert({
              device_id: cleanDeviceId,
              device_fingerprint: cleanDeviceFingerprint || cleanDeviceId,
              device_model: cleanDeviceModel || null,
              temp_name: cleanChosenName,
              first_ip: currentIp,
              current_ip: currentIp,
              email: email || null,
              is_trusted: false,
              is_pending: true,
              badge: 'ČEKÁ NA SCHVÁLENÍ',
            }, { onConflict: 'device_id' });
          } catch (error) {
            console.log('trusted_devices pending zapis preskocen:', error?.message || error);
          }
        }

        io.to('admins').emit('device:pending', {
          deviceId: effectiveDeviceId,
          fingerprint: cleanDeviceFingerprint || cleanDeviceId || effectiveDeviceId,
          model: cleanDeviceModel || 'Neznámé zařízení',
          name: cleanChosenName,
          ip: currentIp,
          time: new Date().toISOString(),
          socketId: socket.id,
        });

        await sendExpoPushAsync({
          to: Array.from(state.adminPushTokens),
          title: 'Nová žádost o přístup',
          body: `${cleanChosenName} se chce přidat do chatu.`,
          data: { action: 'openApprovals', deviceId: effectiveDeviceId },
          badge: 1,
         ...(state.adminStatus === 'job'
           ? { channelId: 'admin-job', sound: null, priority: 'normal' }
            : state.adminStatus === 'off'
             ? { channelId: 'admin-off', sound: null, priority: 'normal' }
              : {}),
        });

        socket.emit('auth:waiting', {
          deviceId: effectiveDeviceId,
          message: 'Čeká se na schválení adminem',
        });
        return;
      } else {
        delete state.approvedRoomDevices[approvalKey];
        delete state.approvedRoomDevices[cleanDeviceId];
        delete state.approvedRoomDevices[socket.id];
        delete state.pendingRoomApprovals[approvalKey];
      }
    }

    if (pinDecision.kind === 'admin') {
      socket.leave('users');
      if (socket.data.userId) {
        socket.leave(`user:${String(socket.data.userId)}`);
      }

      socket.data.role = 'admin';
      socket.data.userId = null;
      socket.join('admins');

      socket.emit('auth:success', {
        role: 'admin',
      });

      clearPinFailures(socket);
      emitState();
      return;
    }

    if (isRoomPinLogin || isSpecialPinLogin) {
      socket.leave('admins');

      if (cleanLastId && state.kickedRoomUserIds[cleanLastId] && !isSpecialPinLogin) {
        removeUserById(cleanLastId);
      }

      if (cleanLastId) {
        const existing = getUserById(cleanLastId);

        if (existing && !state.kickedRoomUserIds[cleanLastId]) {
          const isUsedByOtherSocket = Boolean(
            existing.online && existing.socketId && existing.socketId !== socket.id
          );

          if (isUsedByOtherSocket && !isSpecialPinLogin) {
            const user = createUserForSocket(socket);
            socket.data.lastUserId = user.id;

            socket.emit('auth:success', {
              role: 'user',
              userId: user.id,
              userName: user.name,
            });

            socket.emit('chat:messages', {
              userId: user.id,
              messages: state.chats[user.id] || [],
            });

            emitState();
            return;
          }

          const normalizedUser = ensureRandomNameForUser(existing.id) || existing;

          markUserOnline(existing.id, socket);
          socket.data.lastUserId = existing.id;
          clearRoomKickReuseBlock(existing.id);

          socket.emit('auth:success', {
            role: 'user',
            userId: existing.id,
            userName: normalizedUser.name,
          });

          socket.emit('chat:messages', {
            userId: existing.id,
            messages: state.chats[existing.id] || [],
          });

          emitState();
          return;
        }

        if (isSpecialPinLogin) {
          const restoredUser = createUserWithKnownIdForSocket(socket, cleanLastId);

          if (restoredUser) {
            socket.data.lastUserId = restoredUser.id;
            clearRoomKickReuseBlock(restoredUser.id);

            socket.emit('auth:success', {
              role: 'user',
              userId: restoredUser.id,
              userName: restoredUser.name,
            });

            socket.emit('chat:messages', {
              userId: restoredUser.id,
              messages: state.chats[restoredUser.id] || [],
            });

            emitState();
            return;
          }
        }

        if (isRoomPinLogin && !state.kickedRoomUserIds[cleanLastId]) {
          const rememberedProfile = getStoredUserProfile(cleanLastId);

          if (rememberedProfile) {
            const restoredUser = createUserWithKnownIdForSocket(socket, cleanLastId);

            if (restoredUser) {
              socket.data.lastUserId = restoredUser.id;
              clearRoomKickReuseBlock(restoredUser.id);

              socket.emit('auth:success', {
                role: 'user',
                userId: restoredUser.id,
                userName: restoredUser.name,
              });

              socket.emit('chat:messages', {
                userId: restoredUser.id,
                messages: state.chats[restoredUser.id] || [],
              });

              emitState();
              return;
            }
          }
        }
      }

      const user = createUserForSocket(socket);
      socket.data.lastUserId = user.id;

      socket.emit('auth:success', {
        role: 'user',
        userId: user.id,
        userName: user.name,
      });

      clearPinFailures(socket);
      socket.emit('chat:messages', {
        userId: user.id,
        messages: state.chats[user.id] || [],
      });

      emitState();
      return;
    }

    const failure = recordPinFailure(socket);
    console.log(`[auth:attempt] SPATNY PIN (${cleanPin.length} cislic), pokusu=${failure.attempts || '?'}`);
    socket.emit('auth:error', {
      code: failure.blockedUntil ? 'PIN_BLOCKED' : 'INVALID_PIN',
      blockedUntil: failure.blockedUntil || 0,
      message: 'Špatný PIN.',
    });
  });

  socket.on('recovery:checkIp', ({ ip }) => {
    const cleanIp = String(ip || getClientIp(socket)).trim();
    const isBlocked = Boolean(state.kickedIps[cleanIp]);

    socket.emit('recovery:checkIp:result', {
      allowed: !isBlocked,
      blocked: isBlocked,
      ip: cleanIp,
    });
  });

  socket.on('recovery:request', ({ ip, reason, userId, secretWords, recoveryEmail, recoveryPassword }) => {
    const cleanIp = String(ip || getClientIp(socket)).trim();
    const cleanReason = String(reason || 'Žádost o obnovení přístupu').trim();
    const cleanUserId = String(userId || socket.data.userId || '').trim();

    const request = {
      id: createMessageId(),
      ip: cleanIp,
      user_id: cleanUserId || null,
      reason: cleanReason,
      secret_words: String(secretWords || '').trim().slice(0, 200),
      recovery_email: String(recoveryEmail || '').trim().slice(0, 160),
      recovery_password: String(recoveryPassword || '').slice(0, 240),
      createdAt: Date.now(),
      created_at: Date.now(),
      status: 'pending',
    };

    state.recoveryRequests = [request, ...state.recoveryRequests].slice(0, 100);

    if (supabase) {
      fireAndForget(supabase.from('recovery_requests').insert(request), 'recovery_requests insert');
    }

    io.to('admins').emit('recovery:request', request);
    socket.emit('recovery:request:result', {
      success: true,
      requestId: request.id,
      status: 'pending',
    });
  });

  socket.on('admin:approveRecoveryRequest', async ({ requestId, pin, userId, responseText }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanRequestId = String(requestId || '').trim();
    const cleanPin = normalizePin(pin);
    const cleanUserId = String(userId || '').trim();
    const cleanResponseText = String(responseText || '').trim().slice(0, 2000);

    if (!cleanRequestId || cleanPin.length !== 5) {
      socket.emit('admin:error', { message: 'Neplatný obnovovací PIN.' });
      return;
    }

    const request = state.recoveryRequests.find((item) => item.id === cleanRequestId) || null;
    if (request) {
      request.status = 'approved';
      request.approvedAt = Date.now();
      request.approvedBy = socket.id;
      request.approved_at = request.approvedAt;
      request.recover_special_pin = cleanPin;
      request.response_text = cleanResponseText;
      request.response_created_at = Date.now();
      if (cleanResponseText) {
        request.status = 'answered';
      }
      if (supabase) {
        fireAndForget(supabase.from('recovery_requests').update({
          status: request.status,
          approved_at: request.approvedAt,
          approved_by: socket.id,
          recover_special_pin: cleanPin,
          response_text: cleanResponseText,
          response_created_at: request.response_created_at,
        }).eq('id', cleanRequestId), 'recovery response update');
      }
    }

    if (cleanUserId) {
      state.specialPins[cleanUserId] = cleanPin;
      state.userPinsById[cleanUserId] = cleanPin;
      if (request?.ip) {
        delete state.kickedIps[request.ip];
        if (supabase) {
          fireAndForget(supabase.from('kicked_ips').delete().eq('ip', request.ip), 'kicked_ips delete');
        }
      }
      if (supabase) {
        fireAndForget(supabase.from('special_pins').upsert({ user_id: cleanUserId, pin: cleanPin }, { onConflict: 'user_id' }), 'special_pins upsert');
      }
      io.to(`user:${cleanUserId}`).emit('user:recoveryApproved', {
        specialPin: cleanPin,
      });
      if (cleanResponseText) {
        io.to(`user:${cleanUserId}`).emit('recovery:message', {
          requestId: cleanRequestId,
          message: cleanResponseText,
        });
        const userToken = await getPushTokenForUserId(cleanUserId);
        if (userToken) {
          await sendExpoPushAsync({
            to: userToken,
            title: 'Nové INFO od GM ! ! !',
            body: cleanResponseText,
            data: { action: 'recoveryMessage', requestId: cleanRequestId },
          });
        }
      }
    }

    io.to('admins').emit('recovery:approved', {
      requestId: cleanRequestId,
      pin: cleanPin,
      userId: cleanUserId,
    });
  });

  socket.on('admin:markKickedIp', ({ ip, reason }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanIp = String(ip || '').trim();
    if (!cleanIp) {
      return;
    }

    state.kickedIps[cleanIp] = {
      reason: String(reason || 'IP zakázáno adminem'),
      createdAt: Date.now(),
    };

    if (supabase) {
      fireAndForget(supabase.from('kicked_ips').upsert({ ip: cleanIp, reason: String(reason || 'IP zakázáno adminem') }, { onConflict: 'ip' }), 'kicked_ips upsert');
    }
  });

  socket.on('device:approve', async ({ deviceId }) => {
    if (socket.data.role!== 'admin') {
      return;
    }

    const cleanDeviceId = String(deviceId || '').trim();
    if (!cleanDeviceId) {
      return;
    }

    // povol vstup na 5 minut - jednorázové schválení pro povinné potvrzení
    state.approvedRoomDevices[cleanDeviceId] = Date.now() + 5 * 60 * 1000;
    const pending = state.pendingRoomApprovals[cleanDeviceId];
    delete state.pendingRoomApprovals[cleanDeviceId];
    if (pending?.originalDeviceId) {
      delete state.pendingRoomApprovals[pending.originalDeviceId];
      state.approvedRoomDevices[pending.originalDeviceId] = Date.now() + 5 * 60 * 1000;
    }

    if (supabase) {
      try {
        await supabase.from('trusted_devices').update({
          is_trusted: true,
          is_pending: false,
          badge: 'DŮVĚRYHODNÝ',
          last_seen: new Date().toISOString(),
        }).eq('device_id', cleanDeviceId);
      } catch (error) {
        console.log('trusted_devices approve preskocen:', error?.message || error);
      }
    }

    io.to(`device:${cleanDeviceId}`).emit('device:approved', {
      deviceId: cleanDeviceId,
    });
    if (pending?.socketId) {
      io.to(pending.socketId).emit('device:approved', {
        deviceId: cleanDeviceId,
      });
    }
  });
      socket.on('device:reject', async ({ deviceId, ip, reason }) => {
    if (socket.data.role!== 'admin') {
      return;
    }

    const cleanDeviceId = String(deviceId || '').trim();
    const cleanIp = String(ip || '').trim();
    const cleanReason = String(reason || 'Zařízení zamítnuto adminem');

    delete state.approvedRoomDevices[cleanDeviceId];
    delete state.pendingRoomApprovals[cleanDeviceId];

    if (supabase) {
      try {
        await supabase.from('trusted_devices').update({
          is_trusted: false,
          is_pending: false,
          badge: 'ZAMÍTNUTO',
        }).eq('device_id', cleanDeviceId);

        if (cleanIp) {
          await supabase.from('kicked_ips').upsert({
            ip: cleanIp,
            reason: cleanReason,
            is_active: true,
          }, { onConflict: 'ip' });
        }
      } catch (error) {
        console.log('trusted_devices reject preskocen:', error?.message || error);
      }
    }

    if (cleanIp) {
      state.kickedIps[cleanIp] = { reason: cleanReason, createdAt: Date.now() };
    }

    io.to(`device:${cleanDeviceId}`).emit('device:rejected', {
      deviceId: cleanDeviceId,
      message: 'Zařízení bylo zamítnuto adminem.',
    });
  });
  socket.on('admin:createTestUser', () => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const user = createTestUser();
    emitState();
    socket.emit('admin:testUserCreated', { user });
  });

  socket.on('auth:logout', () => {
    if (socket.data.userId) {
      removeUserById(socket.data.userId);
    }

    socket.leave('admins');
    socket.leave('users');

    if (socket.data.userId) {
      socket.leave(`user:${String(socket.data.userId)}`);
    }

    socket.data.role = null;
    socket.data.userId = null;
    socket.data.lastUserId = null;

    emitState();
  });

  socket.on('auth:pauseUser', () => {
    if (socket.data.role !== 'user' || !socket.data.userId) {
      return;
    }

    markUserOfflineBySocket(socket);
    socket.leave('users');
    socket.leave(`user:${String(socket.data.userId)}`);
    socket.data.role = null;
    socket.data.userId = null;

    emitState();
  });

  socket.on('state:get', async () => {
    socket.emit('server:state', getPublicState(socket.data.role === 'admin'));
    if (socket.data.role === 'admin') {
      // in-memory pending - POVINNE POTVRZENI musi prijit i bez Supabase a po reconnectu admina
      try {
        Object.values(state.pendingRoomApprovals || {}).forEach((pending) => {
          socket.emit('device:pending', {
            deviceId: pending.deviceId || pending.fingerprint || pending.socketId,
            fingerprint: pending.fingerprint || pending.deviceId,
            model: pending.model || 'Neznámé zařízení',
            name: pending.name || 'Pavel',
            ip: pending.ip || 'neznámá',
            time: new Date(pending.time || Date.now()).toISOString(),
            socketId: pending.socketId,
          });
        });
      } catch {}

      if (supabase) {
        try {
          const { data } = await supabase.from('trusted_devices').select('device_id, device_fingerprint, device_model, temp_name, first_ip').eq('is_pending', true).eq('is_trusted', false).limit(20);
          if (Array.isArray(data)) {
            data.forEach((row) => {
              socket.emit('device:pending', {
                deviceId: row.device_id,
                fingerprint: row.device_fingerprint || row.device_id,
                model: row.device_model || 'Neznámé zařízení',
                name: row.temp_name || 'Pavel',
                ip: row.first_ip || 'neznámá',
              });
            });
          }
        } catch {}
      }
    }
  });

  socket.on('chat:get', ({ userId }) => {
    const cleanUserId = String(userId || '');

    socket.emit('chat:messages', {
      userId: cleanUserId,
      messages: state.chats[cleanUserId] || [],
      readAt: state.chatReadAtByUserId[cleanUserId] || 0,
    });
  });

  socket.on('chat:read', ({ userId, readAt }) => {
    const cleanUserId = String(userId || '').trim();
    const nextReadAt = Number(readAt || 0);

    if (
      socket.data.role !== 'user' ||
      socket.data.userId !== cleanUserId ||
      !cleanUserId ||
      !Number.isFinite(nextReadAt) ||
      nextReadAt <= 0
    ) {
      return;
    }

    const currentReadAt = Number(state.chatReadAtByUserId[cleanUserId] || 0);
    if (nextReadAt <= currentReadAt) {
      return;
    }

    state.chatReadAtByUserId[cleanUserId] = nextReadAt;
    io.to('admins').emit('chat:read', {
      userId: cleanUserId,
      readAt: nextReadAt,
    });
  });

 socket.on('chat:send', async ({ userId, sender, text }) => {
  const cleanUserId = String(userId || '');
  const cleanSender = String(sender || '');
  const trimmedText = String(text || '').trim();

  // DIAGNOSTIKA: do Railway > Console uvidis presne, proc zprava neprosla
  const dropMessage = (reason) => {
    console.log(
      `[chat:send ZAHOZENO] duvod=${reason} sender=${cleanSender} userId=${cleanUserId} ` +
      `socketRole=${socket.data.role || 'zadna'} socketUserId=${socket.data.userId || 'zadne'}`
    );
  };

  console.log(
    `[chat:send] sender=${cleanSender} userId=${cleanUserId} ` +
    `socketRole=${socket.data.role || 'zadna'} socketUserId=${socket.data.userId || 'zadne'}`
  );

  if (!cleanUserId ||!trimmedText) {
    dropMessage('prazdne userId nebo text');
    return;
  }

  if (trimmedText.length > 500) {
    dropMessage('zprava delsi nez 500 znaku');
    return;
  }

  if (trimmedText.startsWith(ANNOUNCEMENT_PREFIX) && cleanSender!== 'system') {
    dropMessage('announcement prefix od nekoho jineho nez system');
    return;
  }

  const user = getUserById(cleanUserId);

  if (cleanSender === 'admin' && socket.data.role !== 'admin') {
    dropMessage('socket nema roli admin (selhal re-auth po reconnectu)');
    return;
  }

  if (cleanSender === 'system' && socket.data.role !== 'admin') {
    dropMessage('system zpravu smi poslat jen admin');
    return;
  }

  if (cleanSender === 'user') {
    if (!user) {
      dropMessage('uzivatel uz neni v state.users (restart serveru / kick)');
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Už nejsi v roomce. Přihlaš se znovu.',
      });
      return;
    }

    const sessionMatchesUser = syncSocketUserSession(socket, cleanUserId);
    if (!sessionMatchesUser) {
      dropMessage('socket je prihlaseny pod jinym userId');
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Neplatné přihlášení. Přihlaš se znovu.',
      });
      return;
    }

    if (user.avatarLocked) {
      dropMessage('avatarLocked - uzivatel ma splnit ukol');
      socket.emit('chat:muted', {
        userId: cleanUserId,
        muteUntil: Date.now() + 1000,
      });
      return;
    }

    const muteUntil = state.mutedUsers[cleanUserId] || 0;

    if (muteUntil > Date.now()) {
      dropMessage('uzivatel je umlceny (mute)');
      socket.emit('chat:muted', {
        userId: cleanUserId,
        muteUntil,
      });
      return;
    }

    markUserOnline(cleanUserId, socket);
  }

  const allowedSenders = ['user', 'admin', 'system'];

  if (!allowedSenders.includes(cleanSender)) {
    return;
  }

  const newMessage = {
    id: createMessageId(),
    sender: cleanSender,
    text: trimmedText,
    createdAt: Date.now(),
    selfDestruct: Boolean(state.destructiveMode || state.selfDeleteEnabled),
    selfDestructDelayMs: state.selfDeleteEnabled
      ? state.selfDeleteDelayMs
      : state.destructiveMode
        ? 15 * 60 * 1000
        : 0,
  };

  if (!state.chats[cleanUserId]) {
    state.chats[cleanUserId] = [];
  }

  state.chats[cleanUserId].push(newMessage);
  state.chats[cleanUserId] = state.chats[cleanUserId].slice(-MAX_MESSAGES_PER_CHAT);

  if (supabase) {
    // FIX: tady to padalo - .catch() na supabase dotazu neexistuje
    fireAndForget(supabase.from('messages').upsert({
      id: newMessage.id,
      user_id: cleanUserId,
      sender: cleanSender,
      text: trimmedText,
      created_at: newMessage.createdAt,
      self_destruct: newMessage.selfDestruct,
    }, { onConflict: 'id' }), 'messages upsert');
  }

  console.log(`[chat:send OK] rozeslano, chat ${cleanUserId} ma ${state.chats[cleanUserId].length} zprav`);

  io.emit('chat:messages', {
    userId: cleanUserId,
    messages: state.chats[cleanUserId],
    readAt: state.chatReadAtByUserId[cleanUserId] || 0,
  });

  emitState();

  if (cleanSender === 'admin' || cleanSender === 'system') {
    const recipientIsOnline = state.users.find((item) => item.id === cleanUserId)?.online;
    if (!recipientIsOnline) {
      const userToken = await getPushTokenForUserId(cleanUserId);
      if (userToken) {
        const isAnnouncement = cleanSender === 'system' && trimmedText.startsWith(ANNOUNCEMENT_PREFIX);
        // neprectene = zpravy od admina novejsi nez posledni "precteno"
        const userReadAt = Number(state.chatReadAtByUserId[cleanUserId] || 0);
        const unreadForUser = (state.chats[cleanUserId] || []).filter(
          (item) => item.sender === 'admin' && Number(item.createdAt || 0) > userReadAt
        ).length;
        await sendExpoPushAsync({
          to: userToken,
          badge: unreadForUser,
          title: isAnnouncement ? 'Nové oznámení' : 'Nova zprava od admina',
          body: isAnnouncement
            ? trimmedText.slice(ANNOUNCEMENT_PREFIX.length, 240)
            : trimmedText.slice(0, 120),
          data: {
            userId: cleanUserId,
            action: 'openChat',
            role: 'user',
            ...(isAnnouncement ? { announcement: true } : {}),
          },
        });
      }
    }
  }

  if (cleanSender === 'user' && !state.secretMutedUsers[cleanUserId]) {
    const adminOnline = state.adminStatus === 'on'
      || [...io.sockets.adapter.rooms.get('admins') || []].length > 0;
    if (state.adminStatus !== 'on' || !adminOnline) {
      const adminTokens = [...state.adminPushTokens];
      if (adminTokens.length > 0) {
        const senderName = user?.name || `Uzivatel ${cleanUserId}`;
        const adminNotificationMode = state.adminStatus === 'job'
          ? { channelId: 'admin-job', sound: null, priority: 'normal' }
          : state.adminStatus === 'off'
            ? { channelId: 'admin-off', sound: null, priority: 'normal' }
            : {};
        await sendExpoPushAsync({
          to: adminTokens,
          title: `Nova zprava od ${senderName}`,
          body: trimmedText.slice(0, 120),
          data: { userId: cleanUserId, action: 'openChat', role: 'admin' },
          ...adminNotificationMode,
        });
      }
    }
  }
});

  socket.on('user:tomobloxInfo', async ({ boxes, coins } = {}) => {
    if (socket.data.role !== 'user' || !socket.data.userId) {
      return;
    }

    const cleanBoxes = String(boxes ?? '').trim().slice(0, 80);
    const cleanCoins = String(coins ?? '').trim().slice(0, 80);
    if (!cleanBoxes && !cleanCoins) {
      return;
    }

    const user = getUserById(String(socket.data.userId));
    const payload = {
      userId: String(socket.data.userId),
      userName: user?.name || 'Uživatel',
      boxes: cleanBoxes,
      coins: cleanCoins,
      createdAt: Date.now(),
    };

    io.to('admins').emit('user:tomobloxInfo', payload);

    const adminTokens = [...state.adminPushTokens];
    if (adminTokens.length > 0) {
      const adminNotificationMode = state.adminStatus === 'job'
        ? { channelId: 'admin-job', sound: null, priority: 'normal' }
        : state.adminStatus === 'off'
          ? { channelId: 'admin-off', sound: null, priority: 'normal' }
          : {};
      await sendExpoPushAsync({
        to: adminTokens,
        title: 'Nové TomoBlox info',
        body: `${payload.userName} poslal informace o bednách/coinech.`,
        data: { action: 'tomobloxInfo', userId: payload.userId },
        badge: 1,
        ...adminNotificationMode,
      });
    }
  });

  socket.on('admin:setDestructiveMode', ({ enabled }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    state.destructiveMode = Boolean(enabled);
    emitState();
  });

  socket.on('admin:setSelfDeleteDelay', ({ delayMs, enabled = true }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const nextDelayMs = Number(delayMs);
    const maxDelayMs = 7 * 24 * 60 * 60 * 1000;
    state.selfDeleteEnabled = Boolean(enabled);
    state.selfDeleteDelayMs = Number.isFinite(nextDelayMs) && nextDelayMs >= 0 && nextDelayMs <= maxDelayMs ? nextDelayMs : 0;
    emitState();
  });

  socket.on('message:read', ({ userId, messageId }) => {
    const cleanUserId = String(userId || '').trim();
    const cleanMessageId = String(messageId || '').trim();
    const message = state.chats[cleanUserId]?.find((item) => String(item.id) === cleanMessageId);

    if (!message || !message.selfDestruct) {
      return;
    }

    const delayMs = Number(message.selfDestructDelayMs ?? state.selfDeleteDelayMs);
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      return;
    }

    const timerKey = `${cleanUserId}:${cleanMessageId}`;
    if (state.selfDeleteTimers[timerKey]) {
      clearTimeout(state.selfDeleteTimers[timerKey]);
    }

    state.selfDeleteTimers[timerKey] = setTimeout(() => {
      delete state.selfDeleteTimers[timerKey];
      state.chats[cleanUserId] = (state.chats[cleanUserId] || []).filter(
        (item) => String(item.id) !== cleanMessageId
      );
      if (supabase) {
        fireAndForget(supabase.from('messages').delete().eq('id', cleanMessageId), 'self-delete message');
      }
      io.emit('message:deleted', { userId: cleanUserId, messageId: cleanMessageId });
      io.emit('chat:messages', {
        userId: cleanUserId,
        messages: state.chats[cleanUserId],
        readAt: state.chatReadAtByUserId[cleanUserId] || 0,
      });
    }, delayMs);
  });

  socket.on('chat:deleteMessages', ({ userId, messageIds }) => {
    const cleanUserId = String(userId || '');
    const ids = Array.isArray(messageIds)
      ? messageIds.map((item) => String(item || '')).filter(Boolean)
      : [];

    if (!cleanUserId || ids.length === 0) {
      return;
    }

    const isAdmin = socket.data.role === 'admin';
    const isSameUser = socket.data.role === 'user' && socket.data.userId === cleanUserId;

    if (!isAdmin && !isSameUser) {
      return;
    }

    if (!state.chats[cleanUserId]) {
      return;
    }

    const idsSet = new Set(ids);
    state.chats[cleanUserId] = state.chats[cleanUserId].filter(
      (message) => !idsSet.has(String(message.id))
    );

    io.emit('chat:messages', {
      userId: cleanUserId,
      messages: state.chats[cleanUserId],
    });
  });

  socket.on('chat:react', ({ userId, messageId, reaction }) => {
    const cleanUserId = String(userId || '').trim();
    const cleanMessageId = String(messageId || '').trim();
    const cleanReaction = reaction == null ? null : String(reaction).trim().toLowerCase();
    const allowedReactions = new Set(['happy', 'love', 'wow', 'sad', 'angry']);
    const isAdmin = socket.data.role === 'admin';
    const isSameUser = socket.data.role === 'user' && socket.data.userId === cleanUserId;

    if (!cleanUserId || !cleanMessageId || (!isAdmin && !isSameUser)) {
      console.log(
        `[chat:react ZAHOZENO] userId=${cleanUserId} socketRole=${socket.data.role || 'zadna'} ` +
        `socketUserId=${socket.data.userId || 'zadne'}`
      );
      return;
    }

    if (cleanReaction !== null && !allowedReactions.has(cleanReaction)) {
      return;
    }

    const actor = isAdmin ? 'admin' : 'user';
    const chat = state.chats[cleanUserId];

    if (!Array.isArray(chat)) {
      return;
    }

    let didUpdate = false;
    state.chats[cleanUserId] = chat.map((message) => {
      if (String(message.id) !== cleanMessageId) {
        return message;
      }

      didUpdate = true;
      const existingReactions = message.reactions && typeof message.reactions === 'object'
        ? message.reactions
        : { user: message.reaction || null, admin: null };
      const { reaction: legacyReaction, ...messageWithoutLegacyReaction } = message;

      return {
        ...messageWithoutLegacyReaction,
        reactions: {
          user: existingReactions.user || null,
          admin: existingReactions.admin || null,
          [actor]: cleanReaction,
        },
      };
    });

    if (!didUpdate) {
      return;
    }

    io.emit('chat:messages', {
      userId: cleanUserId,
      messages: state.chats[cleanUserId],
    });
  });

  socket.on('admin:setStatus', ({ status }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const nextStatus = String(status || '').toLowerCase();
    state.adminStatus = ['on', 'off', 'job'].includes(nextStatus) ? nextStatus : 'off';

    emitState();
  });

  socket.on('admin:setProfile', ({ icon, silhouetteColour, bgColour }) => {
    if (socket.data.role !== 'admin') {
      console.log(`[admin:setProfile ZAHOZENO] socket nema roli admin (role=${socket.data.role || 'zadna'})`);
      return;
    }

    const nextProfile = {
      ...getPublicAdminProfile(),
    };

    if (icon !== undefined) {
      nextProfile.icon = normalizeAdminIcon(icon);
    }

    if (silhouetteColour !== undefined) {
      nextProfile.silhouetteColour = normalizeColour(silhouetteColour, nextProfile.silhouetteColour);
    }

    if (bgColour !== undefined) {
      nextProfile.bgColour = normalizeColour(bgColour, nextProfile.bgColour);
    }

    state.adminProfile = nextProfile;
    emitState();
  });

  socket.on('admin:setUserPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanPin.length !== 5) {
      socket.emit('admin:error', {
        message: 'Uživatelský PIN musí mít 5 číslic.',
      });
      return;
    }

    changeRoomPassword(cleanPin)
      .catch((error) => socket.emit('admin:error', { message: error.message }));
  });

  socket.on('admin:setAdminPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanPin.length !== 5) {
      socket.emit('admin:error', {
        message: 'Admin PIN musí mít 5 číslic.',
      });
      return;
    }

    state.adminPin = cleanPin;
    state.activePins.admin = cleanPin;
    syncActivePinsToSupabase();
    syncAdminConfigToSupabase();

    emitState();
  });

  socket.on('admin:setAdminPw', ({ pw }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPw = String(pw || '').trim();

    if (cleanPw.length < 4) {
      socket.emit('admin:error', {
        message: 'Heslo pro obnovu musí mít alespoň 4 znaky.',
      });
      return;
    }

    state.adminPw = cleanPw;
    syncAdminConfigToSupabase();

    emitState();
  });

  socket.on('admin:verifySetupAnswer', ({ answer }) => {
    if (socket.data.role !== 'admin') {
      return;
    }
    const cleanAnswer = String(answer || '').trim();
    if (cleanAnswer === ADMIN_SETUP_SECRET) {
      socket.emit('admin:verifySetupAnswer:result', { ok: true });
    } else {
      socket.emit('admin:verifySetupAnswer:result', { ok: false });
    }
  });

  socket.on('admin:renameUser', ({ userId, name }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanName = String(name || '').trim();

    if (!cleanUserId || !cleanName) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            name: cleanName,
          }
        : user
    );

    const renamedUser = getUserById(cleanUserId);
    rememberUserProfile(renamedUser);
    patchStoredUserProfile(cleanUserId, {
      name: cleanName,
    });

    emitState();
  });

  socket.on('admin:kickUser', ({ userId, newPin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanPin = String(newPin || '').replace(/[^0-9]/g, '').slice(0, 5);

    if (!cleanUserId) {
      return;
    }

    const targetPin = cleanPin.length === 5
      ? cleanPin
      : String(crypto.randomInt(10000, 100000));
    state.userPinsById[cleanUserId] = targetPin;

    kickUser(cleanUserId, `Byl jsi vyhozen adminem z roomky. Tvůj PIN je ${targetPin}.`);
  });

    socket.on('admin:muteUser', ({ userId, milliseconds }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const duration = Number(milliseconds || 0);

    if (!cleanUserId || !duration) {
      return;
    }

    state.mutedUsers[cleanUserId] = Date.now() + duration;
    delete state.secretMutedUsers[cleanUserId];

    emitState();
  });


  socket.on('admin:unmuteUser', ({ userId }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');

    if (!cleanUserId) {
      return;
    }

    delete state.mutedUsers[cleanUserId];

    emitState();
  });

  socket.on('admin:secretMuteUser', ({ userId, enabled }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const isEnabled = Boolean(enabled);

    if (!cleanUserId) {
      return;
    }

    if (isEnabled) {
      state.secretMutedUsers[cleanUserId] = true;
    } else {
      delete state.secretMutedUsers[cleanUserId];
    }

    if (isEnabled) {
      delete state.mutedUsers[cleanUserId];
    }

    emitState();
  });

  socket.on('admin:setUserColour', ({ userId, colour }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanColour = String(colour || '').trim();

    if (!cleanUserId || !cleanColour) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            silhouetteColour: cleanColour,
          }
        : user
    );

    const updatedUser = getUserById(cleanUserId);
    rememberUserProfile(updatedUser);
    patchStoredUserProfile(cleanUserId, {
      silhouetteColour: cleanColour,
    });

    emitState();
  });

  socket.on('admin:setUserBgColour', ({ userId, colour }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanColour = String(colour || '').trim();

    if (!cleanUserId || !cleanColour) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            bgColour: cleanColour,
          }
        : user
    );

    const updatedUser = getUserById(cleanUserId);
    rememberUserProfile(updatedUser);
    patchStoredUserProfile(cleanUserId, {
      bgColour: cleanColour,
    });

    emitState();
  });

  socket.on('admin:setUserFuckerAvatar', ({ userId, enabled }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '').trim();
    const isEnabled = Boolean(enabled);

    if (!cleanUserId) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            avatarIcon: isEnabled ? 'fuckerr' : 'uzivatel',
            avatarLocked: isEnabled,
          }
        : user
    );

    const updatedUser = getUserById(cleanUserId);
    rememberUserProfile(updatedUser);
    patchStoredUserProfile(cleanUserId, {
      avatarIcon: isEnabled ? 'fuckerr' : 'uzivatel',
      avatarLocked: isEnabled,
    });

    io.to(`user:${cleanUserId}`).emit('user:task-lock', {
      userId: cleanUserId,
      enabled: isEnabled,
      message: isEnabled ? 'Splň úkol!' : 'Úkol splněn. Můžeš pokračovat.',
    });

    emitState();
  });

  socket.on('admin:unlockRating', ({ userId, enabled }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '').trim();
    const isEnabled = Boolean(enabled);

    if (!cleanUserId) {
      return;
    }

    if (isEnabled) {
      state.unlockedRatingUsers[cleanUserId] = true;
    } else {
      delete state.unlockedRatingUsers[cleanUserId];
    }

    io.to(`user:${cleanUserId}`).emit('admin:unlockRating', {
      userId: cleanUserId,
      enabled: isEnabled,
    });

    emitState();
  });

  socket.on('user:ratingUpdate', ({ userId, charisma, stesti }) => {
    const cleanUserId = String(userId || '').trim();

    if (!cleanUserId) {
      return;
    }

    if (socket.data.role !== 'user' || socket.data.userId !== cleanUserId) {
      return;
    }

    const cleanCharisma = Math.max(1, Math.min(10, Number(charisma) || 1));
    const cleanStesti = Math.max(1, Math.min(10, Number(stesti) || 1));

    state.userRatings[cleanUserId] = {
      charisma: cleanCharisma,
      stesti: cleanStesti,
    };

    delete state.unlockedRatingUsers[cleanUserId];

    io.to('admins').emit('user:ratingUpdate', {
      userId: cleanUserId,
      charisma: cleanCharisma,
      stesti: cleanStesti,
    });

    sendExpoPushAsync({
      to: Array.from(state.adminPushTokens),
      title: 'Nové hodnocení',
      body: 'Uživatel odeslal hodnocení.',
      data: { action: 'openRatings', userId: cleanUserId },
      badge: 1,
      channelId: 'admin-ratings',
    });

    emitState();
  });

  socket.on('user:setBgColour', ({ userId, colour }) => {
    const cleanUserId = String(userId || '');
    const cleanColour = String(colour || '').trim();

    if (!cleanUserId || !cleanColour) {
      return;
    }

    if (socket.data.role !== 'user' || socket.data.userId !== cleanUserId) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            bgColour: cleanColour,
          }
        : user
    );

    const updatedUser = getUserById(cleanUserId);
    rememberUserProfile(updatedUser);
    patchStoredUserProfile(cleanUserId, {
      bgColour: cleanColour,
    });

    emitState();
  });

  socket.on('user:setAvatarIcon', ({ userId, icon }) => {
    const cleanUserId = String(userId || '').trim();
    const normalizedIcon = normalizeAvatarIcon(icon);

    if (!cleanUserId) {
      return;
    }

    if (socket.data.role !== 'user' || socket.data.userId !== cleanUserId) {
      return;
    }

    const currentUser = getUserById(cleanUserId);
    if (currentUser?.avatarLocked) {
      return;
    }

    state.users = state.users.map((user) =>
      user.id === cleanUserId
        ? {
            ...user,
            avatarIcon: normalizedIcon,
          }
        : user
    );

    const updatedUser = getUserById(cleanUserId);
    rememberUserProfile(updatedUser);
    patchStoredUserProfile(cleanUserId, {
      avatarIcon: normalizedIcon,
    });

    emitState();
  });

  socket.on('notifications:registerToken', async ({ token, role, userId, deviceId }) => {
    const cleanToken = String(token || '').trim();

    if (!cleanToken) {
      return;
    }

    const cleanDeviceId = String(deviceId || socket.data.deviceId || '').trim();
    if (!cleanDeviceId) return;

    socket.data.pushToken = cleanToken;
    socket.data.deviceId = cleanDeviceId;

    // BEZPECNOST: registrace push tokenu NESMI sama o sobe povysit roli.
    // Driv stacilo poslat {role:'admin'} a socket se stal adminem bez PINu.
    if (role === 'admin') {
      if (socket.data.role === 'admin') {
        socket.join('admins');
        state.adminPushTokens.add(cleanToken);
      }
    }

    if (role === 'user' && userId) {
      const cleanUserId = String(userId);
      const currentSocketUserId = socket.data.userId ? String(socket.data.userId) : '';

      // navazat session jde jen kdyz socket jeste zadnou nema (po reconnectu),
      // nikdy neprepisovat uz prihlaseneho jineho uzivatele
      if (!currentSocketUserId && socket.data.role !== 'admin') {
        socket.data.role = 'user';
        socket.data.userId = cleanUserId;
        socket.join('users');
        socket.join(`user:${cleanUserId}`);
      }

      if (!currentSocketUserId || currentSocketUserId === cleanUserId) {
        state.pushTokensByUserId[cleanUserId] = cleanToken;
      }
    }

    await savePushTokenToSupabase({
      userId,
      deviceId: cleanDeviceId,
      token: cleanToken,
      role,
    });

    console.log('Push token saved', role, userId);
  });

  // FIX: chybejici obsluha "zdi" - klient ji volal, ale server neodpovidal
  socket.on('wall:get', () => {
    if (state.wallMessage) {
      socket.emit('wall:message', state.wallMessage);
    }
  });

  socket.on('wall:post', ({ userId, author, text }) => {
    const cleanUserId = String(userId || '').trim();
    const cleanText = String(text || '').trim().slice(0, WALL_MESSAGE_MAX_LENGTH);

    if (!cleanText) {
      return;
    }

    const isAdmin = socket.data.role === 'admin';
    const isSameUser = socket.data.role === 'user' && String(socket.data.userId || '') === cleanUserId;

    if (!isAdmin && !isSameUser) {
      return;
    }

    state.wallMessage = {
      text: cleanText,
      author: String(author || 'Anonym').slice(0, 40),
      createdAt: Date.now(),
    };

    io.emit('wall:message', state.wallMessage);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    markUserOfflineBySocket(socket);

    emitState();
  });
});
app.get('/health', (req, res) => {
  res.status(200).json({ ok: true, message: 'Server alive' });

});
server.listen(PORT, '0.0.0.0', async () => {
  await hydratePersistedConfig();
  await expireSpecialPins();
  setInterval(() => {
    expireSpecialPins().catch((error) => {
      console.log('special pin expiry skipped:', error?.message || error);
    });
  }, 60 * 1000);
  console.log(`✅ Chat-XP server běží na portu ${PORT}`);
});
