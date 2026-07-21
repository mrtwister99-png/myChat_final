const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

const state = {
  userPin: '1111',
  adminPin: '8831',
  adminStatus: 'off',

  nextUserNumber: 1,

  users: [],

  chats: {},

  mutedUsers: {},

  secretMutedUsers: {},

  userPinsById: {},
  kickedRoomUserIds: {},
  userProfilesById: {},
};

const RANDOM_USER_NAMES = [
  'Jiri', 'Jan', 'Petr', 'Josef', 'Pavel', 'Martin', 'Tomas', 'Jaroslav', 'Miroslav', 'Zdenek',
  'Vaclav', 'Michal', 'Frantisek', 'Jakub', 'Milan', 'Karel', 'Lukas', 'David', 'Vladimir', 'Ondrej',
  'Ladislav', 'Roman', 'Marek', 'Stanislav', 'Daniel', 'Radek', 'Antonin', 'Vojtech', 'Filip', 'Adam',
  'Matej', 'Dominik', 'Ales', 'Miloslav', 'Jaromir', 'Patrik', 'Libor', 'Jindrich', 'Vlastimil', 'Milos',
  'Lubomir', 'Stepan', 'Oldrich', 'Rudolf', 'Matyas', 'Ivan', 'Robert', 'Lubos', 'Radim', 'Richard',
  'Vit', 'Bohumil', 'Simon', 'Rostislav', 'Ivo', 'Ludek', 'Dusan', 'Kamil', 'Michael', 'Vladislav',
  'Zbynek', 'Viktor', 'Bohuslav', 'Krystof', 'Alois', 'Rene', 'Vitezslav', 'Tadeas', 'Stefan', 'Eduard',
  'Marcel', 'Jan', 'Jozef', 'Samuel', 'Dalibor', 'Emil', 'Radomir', 'Ludvik', 'Denis', 'Vilem',
  'Tobias', 'Jana', 'Marie', 'Eva', 'Hana', 'Anna', 'Lenka', 'Katerina', 'Lucie', 'Vera',
  'Alena', 'Petra', 'Veronika', 'Jaroslava', 'Tereza', 'Martina', 'Michaela', 'Jitka', 'Helena', 'Ludmila',
  'Zdenka', 'Ivana', 'Monika', 'Eliska', 'Zuzana', 'Marketa', 'Jarmila', 'Barbora', 'Jirina', 'Marcela',
  'Kristyna', 'Dana', 'Dagmar', 'Adela', 'Pavla', 'Vlasta', 'Miroslava', 'Andrea', 'Irena', 'Bozena',
  'Klara', 'Libuse', 'Marta', 'Sarka', 'Nikola', 'Karolina', 'Iveta', 'Pavlina', 'Natalie', 'Olga',
  'Blanka', 'Gabriela', 'Renata', 'Aneta', 'Simona', 'Ruzena', 'Radka', 'Daniela', 'Denisa', 'Iva',
  'Milada', 'Milena', 'Romana', 'Miloslava', 'Miluse', 'Ilona', 'Anezka', 'Sona', 'Kamila', 'Stanislava',
  'Nela', 'Vladimira', 'Nadezda', 'Kvetoslava', 'Renata', 'Danuse', 'Vendula', 'Drahomira', 'Julie', 'Jindriska',
  'Emilie', 'Viktorie',
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

const getPublicUsers = () => {
  return state.users.map((user) => ({
    ...(() => {
      const normalizedUser = ensureRandomNameForUser(user.id) || user;

      return {
        id: normalizedUser.id,
        name: normalizedUser.name,
        silhouetteColour: normalizedUser.silhouetteColour,
        bgColour: normalizedUser.bgColour,
        colour: normalizedUser.silhouetteColour,
        online: normalizedUser.online,
        lastSeenAt: normalizedUser.lastSeenAt,
      };
    })(),
  }));
};

const getPublicState = () => {
  return {
    userPin: state.userPin,
    adminStatus: state.adminStatus,
    users: getPublicUsers(),
    mutedUsers: state.mutedUsers,
    secretMutedUsers: state.secretMutedUsers,
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
  };
};

const getStoredUserProfile = (userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return null;
  }

  return state.userProfilesById[cleanUserId] || null;
};

const clearRoomKickReuseBlock = (userId) => {
  const cleanUserId = String(userId || '').trim();

  if (!cleanUserId) {
    return;
  }

  delete state.kickedRoomUserIds[cleanUserId];
};

const emitState = () => {
  io.emit('server:state', getPublicState());
};

const ensureChatForUser = (user) => {
  if (!state.chats[user.id]) {
    state.chats[user.id] = [
      {
        id: createMessageId(),
        sender: 'admin',
        text: 'Ahoj, tady admin. Napiš mi zprávu.',
        createdAt: Date.now(),
      },
    ];
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
    online: true,
    lastSeenAt: Date.now(),
    socketId: socket.id,
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
    online: true,
    lastSeenAt: Date.now(),
    socketId: socket.id,
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

const markUserOnline = (userId, socket) => {
  state.users = state.users.map((user) =>
    user.id === userId
      ? {
          ...user,
          online: true,
          lastSeenAt: Date.now(),
          socketId: socket.id,
        }
      : user
  );

  socket.data.role = 'user';
  socket.data.userId = userId;

  socket.join('users');
  socket.join(`user:${userId}`);

  const currentUser = getUserById(userId);
  rememberUserProfile(currentUser);
};

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

  state.users.forEach((user) => {
    state.kickedRoomUserIds[String(user.id)] = Date.now();
  });

  state.users = [];
  state.chats = {};
  state.mutedUsers = {};
  state.secretMutedUsers = {};
  state.userPinsById = {};

  emitState();
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

  socket.emit('server:state', getPublicState());

  socket.on('client:ready', ({ lastUserId }) => {
    const cleanLastId = String(lastUserId || '').trim();

    if (!cleanLastId) {
      return;
    }

    socket.data.lastUserId = cleanLastId;
  });

  socket.on('auth:checkPin', ({ pin, lastUserId }) => {
    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);
    const cleanLastId = String(lastUserId || socket.data.lastUserId || '').trim();
    const specialPinForLastId = cleanLastId ? state.userPinsById[cleanLastId] : null;
    const isSpecialPinLogin = Boolean(
      cleanLastId && specialPinForLastId && cleanPin === specialPinForLastId
    );
    const isRoomPinLogin = cleanPin === state.userPin;

    if (cleanPin === state.adminPin) {
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
          const normalizedUser = ensureRandomNameForUser(existing.id) || existing;

          markUserOnline(existing.id, socket);
          socket.data.lastUserId = existing.id;
          clearRoomKickReuseBlock(existing.id);

          if (isSpecialPinLogin) {
            delete state.userPinsById[existing.id];
          }

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
            delete state.userPinsById[restoredUser.id];

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

    socket.emit('auth:error', {
      message: 'Špatný PIN.',
    });
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

  socket.on('state:get', () => {
    socket.emit('server:state', getPublicState());
  });

  socket.on('chat:get', ({ userId }) => {
    const cleanUserId = String(userId || '');

    socket.emit('chat:messages', {
      userId: cleanUserId,
      messages: state.chats[cleanUserId] || [],
    });
  });

  socket.on('chat:send', ({ userId, sender, text }) => {
  const cleanUserId = String(userId || '');
  const cleanSender = String(sender || '');
  const trimmedText = String(text || '').trim();

  if (!cleanUserId || !trimmedText) {
    return;
  }

  const user = getUserById(cleanUserId);

  if (cleanSender === 'user') {
    if (!user) {
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Už nejsi v roomce. Přihlaš se znovu.',
      });
      return;
    }

    if (socket.data.userId !== cleanUserId) {
      socket.emit('user:kicked', {
        userId: cleanUserId,
        reason: 'Neplatné přihlášení. Přihlaš se znovu.',
      });
      return;
    }

    const muteUntil = state.mutedUsers[cleanUserId] || 0;

    if (muteUntil > Date.now()) {
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
  };

  if (!state.chats[cleanUserId]) {
    state.chats[cleanUserId] = [];
  }

  state.chats[cleanUserId].push(newMessage);

  io.emit('chat:messages', {
    userId: cleanUserId,
    messages: state.chats[cleanUserId],
  });

  emitState();
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

  socket.on('admin:setStatus', ({ status }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    state.adminStatus = status === 'on' ? 'on' : 'off';

    emitState();
  });

  socket.on('admin:setUserPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Uživatelský PIN musí mít 4 číslice.',
      });
      return;
    }

    state.userPin = cleanPin;

    kickAllUsers('PIN roomky byl změněn. Přihlaš se znovu.');

    emitState();
  });

  socket.on('admin:setAdminPin', ({ pin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanPin = String(pin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      socket.emit('admin:error', {
        message: 'Admin PIN musí mít 4 číslice.',
      });
      return;
    }

    state.adminPin = cleanPin;

    emitState();
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

    emitState();
  });

  socket.on('admin:kickUser', ({ userId, newPin }) => {
    if (socket.data.role !== 'admin') {
      return;
    }

    const cleanUserId = String(userId || '');
    const cleanPin = String(newPin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (!cleanUserId) {
      return;
    }

    const targetPin = cleanPin.length === 4 ? cleanPin : '0008';
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

    if (!cleanUserId) {
      return;
    }

    state.secretMutedUsers[cleanUserId] = Boolean(enabled);

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

    emitState();
  });

  socket.on('notifications:registerToken', ({ token, role, userId }) => {
    const cleanToken = String(token || '').trim();

    if (!cleanToken) {
      return;
    }

    socket.data.pushToken = cleanToken;

    if (role === 'admin') {
      socket.data.role = 'admin';
      socket.join('admins');
    }

    if (role === 'user' && userId) {
      socket.data.role = 'user';
      socket.data.userId = String(userId);
      socket.join('users');
      socket.join(`user:${String(userId)}`);
    }

    console.log('Push token registered:', {
      socketId: socket.id,
      role,
      userId,
      token: cleanToken.slice(0, 20) + '...',
    });
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
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Chat-XP server běží na portu ${PORT}`);
});
