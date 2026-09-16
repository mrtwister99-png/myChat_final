
import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { socket } from '../socket';
import { playInAppChatMessageSound } from '../utils/inAppSound';
import {
  JobPulseAnimation,
  OffPulseAnimation,
  OnLoopAnimation,
  StatusAnimation,
} from '../components/StatusAnimations';
import { AvatarIcon } from '../components/AvatarIcon';


const MUTE_ICON = require('../assets/icons/timeout.png');
const SECRET_MUTE_ICON = require('../assets/icons/psss.png');
const FUCKER_ICON = require('../assets/icons/fuckerr.png');
const KICK_ICON = require('../assets/icons/stop.png');
const BACK_ICON = require('../assets/icons/backsipka.png');
const HELP_ICON = require('../assets/icons/otaznik.png');
const MINIMIZE_ICON = require('../assets/icons/minimalize.png');
const EXIT_ICON = require('../assets/icons/exit.png');
const LOGO_ICON = require('../assets/icons/logoxp.png');
const STAT_ICON = require('../assets/icons/buttonStat.png');



const DEFAULT_USER_PIN = globalThis.CUSIIK_USER_PIN || '33065';
const DEFAULT_ADMIN_PIN = globalThis.CUSIIK_ADMIN_PIN || '98764';
const DEFAULT_ADMIN_STATUS = globalThis.CUSIIK_ADMIN_STATUS || 'off';
const ANNOUNCEMENT_PREFIX = '[[ANNOUNCEMENT]]';

const MUTE_OPTIONS = [
  { label: '5 min', milliseconds: 5 * 60 * 1000 },
  { label: '10 min', milliseconds: 10 * 60 * 1000 },
  { label: '30 min', milliseconds: 30 * 60 * 1000 },
  { label: '1 hod', milliseconds: 60 * 60 * 1000 },
  { label: '5 hod', milliseconds: 5 * 60 * 60 * 1000 },
  { label: '12 hod', milliseconds: 12 * 60 * 60 * 1000 },
  { label: '1 den', milliseconds: 24 * 60 * 60 * 1000 },
  { label: '2 dny', milliseconds: 2 * 24 * 60 * 60 * 1000 },
];


const USER_COLOURS = [
  { label: 'Zelená', value: '#35c759' },
  { label: 'Červená', value: '#ff3b30' },
  { label: 'Žlutá', value: '#ffcc00' },
  { label: 'Oranžová', value: '#ff9500' },
  { label: 'Fialová', value: '#af52de' },
  { label: 'Bílá', value: '#ffffff' },
  { label: 'Růžová', value: '#ff6fb7' },
  { label: 'Černá', value: '#111111' },
  { label: 'Hnědá', value: '#8b5a2b' },
  { label: 'Tyrkysová', value: '#40e0d0' },
];

const ADMIN_FILL_COLOURS = [
  { label: 'Výchozí', value: '#ece9d8' },
  { label: 'Bílá', value: '#ffffff' },
  { label: 'Ledová', value: '#dceaff' },
  { label: 'Mátová', value: '#d7ffd8' },
  { label: 'Krémová', value: '#fff3c4' },
  { label: 'Levandulová', value: '#e8c6ff' },
];

const ADMIN_OUTLINE_COLOURS = [
  ...USER_COLOURS,
  { label: 'Ledová', value: '#7dd3fc' },
  { label: 'Námořní', value: '#1d4ed8' },
  { label: 'Limetka', value: '#84cc16' },
  { label: 'Smaragdová', value: '#10b981' },
  { label: 'Malinová', value: '#e11d48' },
  { label: 'Rubínová', value: '#be123c' },
  { label: 'Měděná', value: '#b45309' },
  { label: 'Zlatá', value: '#ca8a04' },
  { label: 'Stříbrná', value: '#94a3b8' },
  { label: 'Indigo', value: '#4f46e5' },
];

const USER_ICON_SOURCES = {
  uzivatel: require('../assets/icons/uzivatel.png'),
  cat: require('../assets/icons/cat.png'),
  pes: require('../assets/icons/pes.png'),
  happy: require('../assets/icons/happy.png'),
  devil: require('../assets/icons/devil.png'),
  klaun: require('../assets/icons/klaun.png'),
  stop: require('../assets/icons/stop.png'),
  prase: require('../assets/icons/prase.png'),
  fuckerr: require('../assets/icons/fuckerr.png'),
  zachod: require('../assets/icons/zachod.png'),
  admin: require('../assets/icons/admin.png'),
  admin1: require('../assets/icons/admin1.png'),
  admin2: require('../assets/icons/admin2.png'),
  admin3: require('../assets/icons/admin3.png'),
  admin4: require('../assets/icons/admin4.png'),
  admin5: require('../assets/icons/admin5.png'),
};

const ADMIN_ICON_OPTIONS = [
  { key: 'admin', label: 'admin' },
  { key: 'admin1', label: 'admin1' },
  { key: 'admin2', label: 'admin2' },
  { key: 'admin3', label: 'admin3' },
  { key: 'admin4', label: 'admin4' },
  { key: 'admin5', label: 'admin5' },
];

const normalizeAdminIcon = (iconKey) => {
  const cleanIcon = String(iconKey || '').trim().toLowerCase();
  return USER_ICON_SOURCES[cleanIcon] && cleanIcon.startsWith('admin') ? cleanIcon : 'admin';
};

const normalizeAvatarIcon = (iconKey) => {
  const cleanIcon = String(iconKey || '').trim().toLowerCase();

  if (cleanIcon === 'klan') {
    return 'klaun';
  }

  if (cleanIcon === 'fucker') {
    return 'fuckerr';
  }

  if (cleanIcon === 'vykricnik') {
    return 'prase';
  }

  return USER_ICON_SOURCES[cleanIcon] ? cleanIcon : 'uzivatel';
};

const getUserIconSource = (iconKey) => {
  return USER_ICON_SOURCES[normalizeAvatarIcon(iconKey)] || USER_ICON_SOURCES.uzivatel;
};

const getAdminIconSource = (iconKey) => {
  return USER_ICON_SOURCES[normalizeAdminIcon(iconKey)] || USER_ICON_SOURCES.admin;
};

const getGlobalMutedUsers = () => {
  if (!globalThis.CUSIIK_MUTED_USERS) {
    globalThis.CUSIIK_MUTED_USERS = {};
  }

  return globalThis.CUSIIK_MUTED_USERS;
};

const getGlobalSecretMutedUsers = () => {
  if (!globalThis.CUSIIK_SECRET_MUTED_USERS) {
    globalThis.CUSIIK_SECRET_MUTED_USERS = {};
  }

  return globalThis.CUSIIK_SECRET_MUTED_USERS;
};

const getGlobalChats = () => {
  if (!globalThis.CUSIIK_CHATS) {
    globalThis.CUSIIK_CHATS = {};
  }

  return globalThis.CUSIIK_CHATS;
};

const getGlobalReadCounts = () => {
  if (!globalThis.CUSIIK_ADMIN_READ_COUNTS) {
    globalThis.CUSIIK_ADMIN_READ_COUNTS = {};
  }

  return globalThis.CUSIIK_ADMIN_READ_COUNTS;
};

const persistReadCounts = (counts) => {
  try {
    globalThis.CUSIIK_ADMIN_READ_COUNTS = counts;
  } catch {}
};
const clearAllLocalAdminData = () => {
  try {
    globalThis.CUSIIK_CHATS = {};
    globalThis.CUSIIK_ADMIN_READ_COUNTS = {};
    globalThis.CUSIIK_MUTED_USERS = {};
    globalThis.CUSIIK_SECRET_MUTED_USERS = {};
    globalThis.CUSIIK_INITIAL_LOAD_DONE = true;
  } catch {}
};

const getMuteMsLeft = (userId, nowTick) => {
  const mutedUsers = getGlobalMutedUsers();
  const muteUntil = mutedUsers[userId] || 0;
  const diff = muteUntil - nowTick;

  return diff > 0 ? diff : 0;
};

const isUserMutedNow = (userId, nowTick) => {
  return getMuteMsLeft(userId, nowTick) > 0;
};

const formatMuteLeft = (userId, nowTick) => {
  const diff = getMuteMsLeft(userId, nowTick);

  if (diff <= 0) {
    return '';
  }

  const minutes = Math.ceil(diff / 1000 / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.ceil(minutes / 60);

  if (hours < 24) {
    return `${hours} hod`;
  }

  const days = Math.ceil(hours / 24);

  if (days === 1) {
    return '1 den';
  }

  if (days >= 2 && days <= 4) {
    return `${days} dny`;
  }

  return `${days} dní`;
};

const formatLastSeen = (user, nowTick) => {
  if (user.online) {
    return 'Online';
  }

  const lastSeenAt = user.lastSeenAt || user.lastSeen || 0;

  if (!lastSeenAt) {
    return 'Offline';
  }

  const diff = nowTick - lastSeenAt;

  if (diff <= 0) {
    return 'Byl online právě teď';
  }

  const minutes = Math.floor(diff / 1000 / 60);

  if (minutes < 1) {
    return 'Byl online před chvílí';
  }

  if (minutes < 60) {
    return `Byl online před ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `Byl online před ${hours} hod`;
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return 'Byl online před 1 dnem';
  }

  return `Byl online před ${days} dny`;
};

const getUserMessageCount = (userId) => {
  const chats = getGlobalChats();
  const messages = chats[userId] || [];

  return messages.filter((message) => {
    const sender = String(message?.sender || '').toLowerCase();
    return sender === 'user';
  }).length;
};

const areReadCountsEqual = (a, b) => {
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => (a?.[key] || 0) === (b?.[key] || 0));
};

const areUsersEqual = (a, b) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    const current = a[index];
    const next = b[index];

    const lastSeenDiff = Math.abs((current.lastSeenAt || 0) - (next.lastSeenAt || 0));

    if (
      current.id !== next.id ||
      current.name !== next.name ||
      current.online !== next.online ||
      lastSeenDiff > 60000 ||
      current.silhouetteColour !== next.silhouetteColour ||
      current.bgColour !== next.bgColour ||
      current.avatarIcon !== next.avatarIcon
      || Boolean(current.avatarLocked) !== Boolean(next.avatarLocked)
    ) {
      return false;
    }
  }

  return true;
};



const OnlineCountText = ({ count, style }) => {


  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count) {
      prevCountRef.current = count;

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.35,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [count]);

  return (
    <Animated.Text style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {count} online
    </Animated.Text>
  );
};

const UnreadBadge = ({ count, isSecret }) => {


  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current === 0 && count > 0) {
      scaleAnim.setValue(0);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]).start();
    } else if (count > prevCountRef.current) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.5, duration: 90, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.45, duration: 140, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
    prevCountRef.current = count;
  }, [count]);

  if (count <= 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.unreadCircle, isSecret && styles.unreadCircleSecret, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.unreadCircleText}>{count}</Text>
    </Animated.View>
  );
};

const UnreadAvatarPulse = ({ count, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scaleAnim.setValue(0.65);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.3, duration: 160, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [count]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {children}
    </Animated.View>
  );
};

const NumericKeypad = ({ value, onChange, maxLength = 4 }) => {
  const pressDigit = (digit) => {
    if (value.length >= maxLength) return;
    onChange(value + digit);
  };

  const pressBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['⌫', '0', ''],
  ];

  return (
    <View style={styles.keypadWrap}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.keypadRow}>
          {row.map((key, keyIndex) => {
            if (key === '') {
              return <View key={`ghost-${keyIndex}`} style={styles.keypadKeyGhost} />;
            }

            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  styles.keypadKey,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={() => (key === '⌫' ? pressBackspace() : pressDigit(key))}
              >
                <Text style={styles.keypadKeyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const PinDots = ({ length, maxLength = 5 }) => {
  return (
    <View style={styles.pinDotsRow}>
      {Array.from({ length: maxLength }).map((_, index) => (
        <View
          key={index}
          style={[styles.pinDot, index < length && styles.pinDotFilled]}
        />
      ))}
    </View>
  );
};

const SWIPE_UNLOCK_THRESHOLD = -70;

const SwipeToUnlockRow = ({ children, onUnlock, disabled }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled) {
          return false;
        }

        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        const nextValue = Math.min(0, Math.max(gestureState.dx, -110));
        translateX.setValue(nextValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldUnlock = gestureState.dx <= SWIPE_UNLOCK_THRESHOLD;

        Animated.timing(translateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();

        if (shouldUnlock) {
          onUnlock();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{ transform: [{ translateX }] }}
    >
      {children}
    </Animated.View>
  );
};

const AdminPin = ({ navigation }) => {
  const [users, setUsers] = useState([
  ]);

  const [nowTick, setNowTick] = useState(Date.now());
  const lastKnownMessageCountsRef = useRef({});


  const [currentUserPin, setCurrentUserPin] = useState(DEFAULT_USER_PIN);
  const [currentAdminPin, setCurrentAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [adminStatus, setAdminStatus] = useState(DEFAULT_ADMIN_STATUS);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserName, setNewUserName] = useState('');

  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [hardResetStep, setHardResetStep] = useState('pin'); // 'pin' | 'confirm1' | 'confirm2'
  const [newPin, setNewPin] = useState('');
  const [changeError, setChangeError] = useState('');
  const [pendingHardResetPin, setPendingHardResetPin] = useState('');
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [preparationModalVisible, setPreparationModalVisible] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastError, setBroadcastError] = useState('');
  const [broadcastMode, setBroadcastMode] = useState('message');
  const [announcementTarget, setAnnouncementTarget] = useState('all');
  const [announcementUserIds, setAnnouncementUserIds] = useState([]);
  const [preparationUserIds, setPreparationUserIds] = useState([]);
  const [kickPinModalVisible, setKickPinModalVisible] = useState(false);
  const [kickPin, setKickPin] = useState('00221');
  const [kickPinError, setKickPinError] = useState('');


    const [newAdminPin, setNewAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');


  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [colourModalVisible, setColourModalVisible] = useState(false);
  const [bgColourModalVisible, setBgColourModalVisible] = useState(false);
  const [quickActionsModalVisible, setQuickActionsModalVisible] = useState(false);

  const [readCounts, setReadCounts] = useState(getGlobalReadCounts());
  const [secretMutedUsers, setSecretMutedUsers] = useState(getGlobalSecretMutedUsers());
  const [adminProfile, setAdminProfile] = useState(globalThis.CUSIIK_ADMIN_PROFILE || { icon: 'admin', silhouetteColour: '#0b3d91', bgColour: '#ece9d8' });
  const [adminEditModalVisible, setAdminEditModalVisible] = useState(false);
  const [adminIconModalVisible, setAdminIconModalVisible] = useState(false);
  const [adminOutlineModalVisible, setAdminOutlineModalVisible] = useState(false);
  const [adminFillModalVisible, setAdminFillModalVisible] = useState(false);
  const [adminPinModalVisible, setAdminPinModalVisible] = useState(false);
  const [adminPwModalVisible, setAdminPwModalVisible] = useState(false);
  const [newAdminPw, setNewAdminPw] = useState('');
  const [adminPwError, setAdminPwError] = useState('');
    const [currentAdminPw, setCurrentAdminPw] = useState(globalThis.CUSIIK_ADMIN_PW || '');
  const [actionHistory, setActionHistory] = useState([]);
  const [actionHistoryExpanded, setActionHistoryExpanded] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [unlockedRatingUsers, setUnlockedRatingUsers] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [ratingConfirmVisible, setRatingConfirmVisible] = useState(false);
  const [ratingConfirmUser, setRatingConfirmUser] = useState(null);



  const [connectionText, setConnectionText] = useState(
    socket.connected ? 'Server online' : 'Připojuji server...'
  );
  const connectionTextTimeoutRef = useRef(null);

  const isAdminOnline = adminStatus === 'on';
  const isAdminJob = adminStatus === 'job';

  const getAdminStatusLabel = () => {
    if (adminStatus === 'on') {
      return 'ON';
    }

    if (adminStatus === 'job') {
      return 'JOB';
    }

    return 'OFF';
  };

  const getNextAdminStatus = () => {
    if (adminStatus === 'off') {
      return 'on';
    }

    if (adminStatus === 'on') {
      return 'job';
    }

    return 'off';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        Keyboard.dismiss();
      } else {
        setNowTick(Date.now());
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    globalThis.CUSIIK_INITIAL_LOAD_DONE = false;
    lastKnownMessageCountsRef.current = {};

    const handleConnect = () => {
      if (connectionTextTimeoutRef.current) {
        clearTimeout(connectionTextTimeoutRef.current);
        connectionTextTimeoutRef.current = null;
      }

      setConnectionText('Server online');
      socket.emit('state:get');

      const pushToken = globalThis.CUSIIK_EXPO_PUSH_TOKEN;
      if (pushToken) {
        socket.emit('notifications:registerToken', {
          token: pushToken,
          role: 'admin',
        });
      }
    };

    const handleDisconnect = () => {
      if (connectionTextTimeoutRef.current) {
        clearTimeout(connectionTextTimeoutRef.current);
      }

      connectionTextTimeoutRef.current = setTimeout(() => {
        setConnectionText('Server offline - lokální režim');
      }, 400);
    };

    const handleConnectError = () => {
      if (connectionTextTimeoutRef.current) {
        clearTimeout(connectionTextTimeoutRef.current);
      }

      connectionTextTimeoutRef.current = setTimeout(() => {
        setConnectionText('Server nedostupný - lokální režim');
      }, 400);
    };

    const handleServerState = (serverState) => {
      if (serverState?.adminStatus) {
        setAdminStatus(serverState.adminStatus);
        globalThis.CUSIIK_ADMIN_STATUS = serverState.adminStatus;
      }

      if (serverState?.userPin) {
        setCurrentUserPin(serverState.userPin);
        globalThis.CUSIIK_USER_PIN = serverState.userPin;
      }

      if (serverState?.mutedUsers) {
        globalThis.CUSIIK_MUTED_USERS = serverState.mutedUsers;
      }

      if (serverState?.secretMutedUsers) {
        setSecretMutedUsers(serverState.secretMutedUsers);
        globalThis.CUSIIK_SECRET_MUTED_USERS = serverState.secretMutedUsers;
      }

      if (serverState?.unlockedRatingUsers) {
        setUnlockedRatingUsers(serverState.unlockedRatingUsers);
      }

      if (serverState?.userRatings) {
        setUserRatings(serverState.userRatings);
      }

      if (serverState?.adminProfile) {
        const normalizedAdminProfile = {
          icon: normalizeAdminIcon(serverState.adminProfile.icon || 'admin'),
          silhouetteColour: serverState.adminProfile.silhouetteColour || '#0b3d91',
          bgColour: serverState.adminProfile.bgColour || '#ece9d8',
        };

        setAdminProfile(normalizedAdminProfile);
        globalThis.CUSIIK_ADMIN_PROFILE = normalizedAdminProfile;
      }

      if (Array.isArray(serverState?.users)) {
        const normalizedUsers = serverState.users.map((user) => ({
          ...user,
          online: Boolean(user.online),
          lastSeenAt: user.lastSeenAt || user.lastSeen || 0,
          silhouetteColour: user.silhouetteColour || user.colour || '#0b3d91',
          bgColour: user.bgColour || '#ece9d8',
          avatarIcon: normalizeAvatarIcon(user.avatarIcon),
          avatarLocked: Boolean(user.avatarLocked),
        }));

        setUsers((currentUsers) => {
          if (areUsersEqual(currentUsers, normalizedUsers)) {
            return currentUsers;
          }

          return normalizedUsers;
        });

        // FIX: po reconnectu admina načíst chaty všech uživatelů pro správné unread
        if (socket.connected) {
          normalizedUsers.forEach((user) => {
            socket.emit('chat:get', { userId: user.id });
          });
        }

        setTimeout(() => {
          globalThis.CUSIIK_INITIAL_LOAD_DONE = true;
        }, 3000);
      }

    };

    const handleChatMessages = ({ userId, messages }) => {
      const cleanUserId = String(userId || '').trim();

      if (!cleanUserId) {
        return;
      }

      const chats = getGlobalChats();
            const safeMessages = messages || [];
      const userMessagesCount = safeMessages.filter((item) => {
        const s = String(item?.sender || '').toLowerCase();
        return s === 'user';
      }).length;
      const activeAdminChatUserId = String(globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID || '').trim();
      const secretMutedMap = getGlobalSecretMutedUsers();
      const isSecretMuted = Boolean(secretMutedMap[cleanUserId]);

      chats[cleanUserId] = safeMessages;
      
      const previousMessageCount = lastKnownMessageCountsRef.current[cleanUserId] || 0;
      const isNewMessageArrived = userMessagesCount > previousMessageCount;
      const isInitialLoadDone = Boolean(globalThis.CUSIIK_INITIAL_LOAD_DONE);
      const isAdminViewingThisChat = activeAdminChatUserId === cleanUserId;

      lastKnownMessageCountsRef.current[cleanUserId] = userMessagesCount;

  
      if (
        isNewMessageArrived &&
        isInitialLoadDone &&
        !isSecretMuted &&
        AppState.currentState === 'active'
      ) {
        playInAppChatMessageSound();
      }

      const nextReadCounts = { ...getGlobalReadCounts() };

      if (!Object.prototype.hasOwnProperty.call(nextReadCounts, cleanUserId)) {
        const isInitialLoad = !globalThis.CUSIIK_INITIAL_LOAD_DONE;
        if (isInitialLoad) {
          nextReadCounts[cleanUserId] = userMessagesCount;
        } else {
          nextReadCounts[cleanUserId] = 0;
        }
      }

      if (isSecretMuted) {
        nextReadCounts[cleanUserId] = userMessagesCount;
      } else if (activeAdminChatUserId && activeAdminChatUserId === cleanUserId) {
        nextReadCounts[cleanUserId] = userMessagesCount;
      }

      persistReadCounts(nextReadCounts);

      setReadCounts((currentReadCounts) => {
        if (areReadCountsEqual(currentReadCounts, nextReadCounts)) {
          return currentReadCounts;
        }

        return nextReadCounts;
      });
    };

       const handleHardReset = () => {
      clearAllLocalAdminData();
      setReadCounts({});
      setSecretMutedUsers({});
      setUsers([]);
      logAction('HARD ROOM RESET přijat ze serveru - lokální data vymazána.');

    };

    const handleUserRatingUpdate = ({ userId, charisma, stesti } = {}) => {
      const cleanUserId = String(userId || '').trim();

      if (!cleanUserId) {
        return;
      }

      setUserRatings((currentRatings) => ({
        ...currentRatings,
        [cleanUserId]: { charisma, stesti },
      }));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('room:hardReset', handleHardReset);
    socket.on('user:ratingUpdate', handleUserRatingUpdate);


    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('state:get');
      const pushToken = globalThis.CUSIIK_EXPO_PUSH_TOKEN;
      if (pushToken) {
        socket.emit('notifications:registerToken', {
          token: pushToken,
          role: 'admin',
        });
      }
    }

     return () => {
      if (connectionTextTimeoutRef.current) {
        clearTimeout(connectionTextTimeoutRef.current);
        connectionTextTimeoutRef.current = null;
      }

      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('room:hardReset');
      socket.off('user:ratingUpdate', handleUserRatingUpdate);
    };
  }, []);


  const renderUserNameWithMute = (user, textStyle) => {
    return (
      <Text style={textStyle}>{user.name}</Text>
    );
  };

   const renderMuteTag = (user) => {
    const muteText = formatMuteLeft(user.id, nowTick);
    const isSecretMuted = Boolean(secretMutedUsers[user.id]);

    if (!muteText && !isSecretMuted) {
      return null;
    }

    return (
      <Text style={[isSecretMuted ? styles.muteTagSecretText : styles.muteTagText, styles.muteTagInline]}>
        {isSecretMuted ? '(potají)' : `(${muteText})`}
      </Text>
    );
  };


  const getUnreadCount = (userId) => {
    const userMessageCount = getUserMessageCount(userId);
    const readCount = readCounts[userId] || 0;
    const unread = userMessageCount - readCount;

    return unread > 0 ? unread : 0;
  };

  const markUserAsRead = (userId) => {
    const cleanId = String(userId || '').trim();
    if (!cleanId) return;

    const nextReadCounts = {
      ...getGlobalReadCounts(),
      [cleanId]: getUserMessageCount(cleanId),
    };

    persistReadCounts(nextReadCounts);
    setReadCounts(nextReadCounts);
  };

  const openAdminChat = (user) => {
    markUserAsRead(user.id);

    navigation.navigate('AdminChat', {
      userId: user.id,
      userName: user.name,
    });
  };

  const openUserMenu = (user) => {
    setActionUser(user);
    setUserMenuVisible(true);
  };

  const goToPinEntry = () => {
    try {
      socket.emit('auth:logout');
      globalThis.CUSIIK_CURRENT_ROLE = null;
      globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID = null;
    } catch {}
    navigation.replace('PinEntry');
  };

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goToPinEntry();
      return true;
    });

    return () => backSubscription.remove();
  }, [navigation]);

  const closeApp = () => {
    if (Platform.OS === 'android') {
      try {
        BackHandler.exitApp();
      } catch {}
    }
  };

  const closeUserMenu = () => {
    setUserMenuVisible(false);
    setActionUser(null);
  };

  const logAction = (text) => {
    setActionHistory((prev) => [text, ...prev].slice(0, 10));
  };


  const toggleAdminStatus = () => {
    const nextStatus = getNextAdminStatus();

    globalThis.CUSIIK_ADMIN_STATUS = nextStatus;
    setAdminStatus(nextStatus);

    if (socket.connected) {
      socket.emit('admin:setStatus', {
        status: nextStatus,
      });
    }

    logAction(
      nextStatus === 'on'
        ? 'Status admina byl přepnut na ON.'
        : nextStatus === 'job'
          ? 'Status admina byl přepnut na JOB.'
          : 'Status admina byl přepnut na OFF.'
    );

  };

  const openRenameModal = (user) => {
    setSelectedUser(user);
    setNewUserName(user.name);
    setRenameModalVisible(true);
    setUserMenuVisible(false);
  };

  const closeRenameModal = () => {
    setRenameModalVisible(false);
    setNewUserName('');
  };

  const saveRename = () => {
    const trimmedName = newUserName.trim();

    if (!selectedUser || !trimmedName) {
      return;
    }

    const renamedId = selectedUser.id;

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === renamedId
          ? {
              ...user,
              name: trimmedName,
            }
          : user
      )
    );

    setSelectedUser((prev) => (prev ? { ...prev, name: trimmedName } : prev));
    setActionUser((prev) => (prev && prev.id === renamedId ? { ...prev, name: trimmedName } : prev));

    if (socket.connected) {
      socket.emit('admin:renameUser', {
        userId: renamedId,
        name: trimmedName,
      });
    }

  logAction(`Uživatel byl přejmenován na ${trimmedName}.`);

    closeRenameModal();
  };

   const openChangeModal = () => {
    setNewPin('');
    setChangeError('');
    setHardResetStep('pin');
    setChangeModalVisible(true);
  };

  const closeChangeModal = () => {
    setChangeModalVisible(false);
    setNewPin('');
    setChangeError('');
    setPendingHardResetPin('');
    setHardResetStep('pin');
  };

  const openBroadcastModal = () => {
    setBroadcastMessage('');
    setBroadcastError('');
    setBroadcastMode('message');
    setAnnouncementTarget('all');
    setAnnouncementUserIds([]);
    setBroadcastModalVisible(true);
  };

  const openPreparationChecklist = () => {
    const onlineUserIds = users
      .filter((user) => Boolean(user.online))
      .map((user) => String(user.id));

    setPreparationUserIds(onlineUserIds);
    setPreparationModalVisible(true);
  };

  const closePreparationChecklist = () => {
    setPreparationModalVisible(false);
    setPreparationUserIds([]);
  };

  const togglePreparationUser = (userId) => {
    const cleanUserId = String(userId);
    setPreparationUserIds((currentIds) =>
      currentIds.includes(cleanUserId)
        ? currentIds.filter((currentId) => currentId !== cleanUserId)
        : [...currentIds, cleanUserId]
    );
  };

  const closeBroadcastModal = () => {
    setBroadcastModalVisible(false);
    setBroadcastMessage('');
    setBroadcastError('');
  };

  const sendBroadcastMessage = () => {
    const trimmedMessage = broadcastMessage.trim();
    const targetUsers = announcementTarget === 'all'
      ? users
      : users.filter((user) => announcementUserIds.includes(String(user.id)));

    if (!trimmedMessage) {
      setBroadcastError(broadcastMode === 'announcement' ? 'Napiš text oznámení.' : 'Napiš zprávu, kterou chceš odeslat.');
      return;
    }

    if (targetUsers.length === 0) {
      setBroadcastError('Vyber alespoň jednoho uživatele.');
      return;
    }

    if (!socket.connected) {
      setBroadcastError('Server je offline. Zprávu nyní nelze odeslat.');
      return;
    }

    targetUsers.forEach((user) => {
      socket.emit('chat:send', {
        userId: user.id,
        sender: broadcastMode === 'announcement' ? 'system' : 'admin',
        text: broadcastMode === 'announcement' ? `${ANNOUNCEMENT_PREFIX}${trimmedMessage}` : trimmedMessage,
      });
    });

    logAction(`${broadcastMode === 'announcement' ? 'Oznámení' : 'Zpráva'} bylo odesláno ${targetUsers.length} uživatelům.`);
    closeBroadcastModal();
  };

  const toggleAnnouncementUser = (userId) => {
    const cleanUserId = String(userId);
    setBroadcastError('');
    setAnnouncementUserIds((currentIds) =>
      currentIds.includes(cleanUserId)
        ? currentIds.filter((currentId) => currentId !== cleanUserId)
        : [...currentIds, cleanUserId]
    );
  };


  const openKickPinModal = (user) => {
    if (!user) {
      return;
    }

    setActionUser(user);
    setKickPin('00221');
    setKickPinError('');
    setUserMenuVisible(false);
    setKickPinModalVisible(true);
  };

  const closeKickPinModal = () => {
    setKickPinModalVisible(false);
    setKickPin('00221');
    setKickPinError('');
  };

  const confirmKickUser = () => {
    const cleanedPin = kickPin.replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanedPin.length !== 5) {
      setKickPinError('Heslo musí mít přesně 5 číslic.');
      return;
    }

    kickUserById(actionUser, { newPin: cleanedPin });
    closeKickPinModal();
  };

  const saveChangeAndKickUsers = () => {
    const cleanedPin = newPin.replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanedPin.length !== 5) {
      setChangeError('PIN musí mít přesně 5 číslic.');
      return;
    }

    setPendingHardResetPin(cleanedPin);
    setHardResetStep('confirm1');
  };

  const confirmHardResetStep1 = () => {
    setHardResetStep('confirm2');
  };

  const goBackFromHardResetStep1 = () => {
    setHardResetStep('pin');
  };

  const confirmHardResetFinal = () => {
    const cleanPin = String(pendingHardResetPin || '').replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanPin.length !== 5) {
      setChangeError('PIN musí mít přesně 5 číslic.');
      setHardResetStep('pin');
      return;
    }

    // FIX: modal zavřeme hned, těžké změny stavu (mazání dat) proběhnou
    // až po dokončení fade-out animace - žádné probliknutí prázdné roomky.
    closeChangeModal();

    setTimeout(() => {
      globalThis.CUSIIK_USER_PIN = cleanPin;
      setCurrentUserPin(cleanPin);

      clearAllLocalAdminData();
      setReadCounts({});
      setSecretMutedUsers({});
      setUsers([]);

      if (socket.connected) {
        socket.emit('admin:setUserPin', {
          pin: cleanPin,
        });
      }

logAction(`HARD ROOM RESET proveden. Nový PIN je ${cleanPin}.`);

    }, 260);
  };

   const openAdminProfileEditor = () => {
    setAdminEditModalVisible(true);
  };

  const closeAdminProfileEditor = () => {
    setAdminEditModalVisible(false);
    setAdminIconModalVisible(false);
    setAdminOutlineModalVisible(false);
    setAdminFillModalVisible(false);
    setAdminPinModalVisible(false);
    setAdminPwModalVisible(false);
  };

  const openAdminPinModal = () => {
    setNewAdminPin('');
    setAdminPinError('');
    setAdminPinModalVisible(true);
  };

  const openAdminPwModal = () => {
    setNewAdminPw('');
    setAdminPwError('');
    setAdminPwModalVisible(true);
  };


  const updateAdminIcon = (iconKey) => {
    const normalizedIcon = normalizeAdminIcon(iconKey);
    const nextProfile = {
      ...adminProfile,
      icon: normalizedIcon,
    };

    setAdminProfile(nextProfile);
    globalThis.CUSIIK_ADMIN_PROFILE = nextProfile;

    if (socket.connected) {
      socket.emit('admin:setProfile', {
        icon: normalizedIcon,
      });
    }

    logAction(`Admin ikonka byla změněna na ${normalizedIcon}.`);

    setAdminIconModalVisible(false);
  };

  const updateAdminOutlineColour = (colour) => {
    const nextProfile = {
      ...adminProfile,
      silhouetteColour: colour,
    };

    setAdminProfile(nextProfile);
    globalThis.CUSIIK_ADMIN_PROFILE = nextProfile;

    if (socket.connected) {
      socket.emit('admin:setProfile', {
        silhouetteColour: colour,
      });
    }

  logAction('Barva obrysu admina byla změněna.');

    setAdminOutlineModalVisible(false);
  };

  const updateAdminFillColour = (colour) => {
    const nextProfile = {
      ...adminProfile,
      bgColour: colour,
    };

    setAdminProfile(nextProfile);
    globalThis.CUSIIK_ADMIN_PROFILE = nextProfile;

    if (socket.connected) {
      socket.emit('admin:setProfile', {
        bgColour: colour,
      });
    }

    logAction('Výplň admina byla změněna.');

    setAdminFillModalVisible(false);
  };


     const kickUserById = (user, options = {}) => {
    if (!user) {
      return;
    }

    const targetPin = String(options.newPin || '').replace(/[^0-9]/g, '').slice(0, 5) || '00221';

    if (socket.connected) {
      socket.emit('admin:kickUser', {
        userId: user.id,
        newPin: targetPin,
        specialPin: targetPin,
        preserveIdentity: true,
      });
      logAction(`Kick uživatele ${user.name} odeslán serveru k potvrzení.`);
      return;
    }

    logAction(`Kick uživatele ${user.name} nebyl odeslán: server je offline.`);
  };

  const saveNewAdminPin = () => {
    const cleanedPin = newAdminPin.replace(/[^0-9]/g, '').slice(0, 5);

    if (cleanedPin.length !== 5) {
      setAdminPinError('Admin PIN musí mít přesně 5 číslic.');
      return;
    }

    globalThis.CUSIIK_ADMIN_PIN = cleanedPin;

    setCurrentAdminPin(cleanedPin);

    if (socket.connected) {
      socket.emit('admin:setAdminPin', {
        pin: cleanedPin,
      });
    }

    logAction(`Admin PIN byl změněn na ${cleanedPin}.`);

    setAdminPinModalVisible(false);
  };

  // FIX: obnovovací heslo admina - zatím jen lokální state + socket stub.
  // Napojení na EntryPin (reset zapomenutého PINu) doděláme příště.
  const saveNewAdminPw = () => {
    const trimmedPw = newAdminPw.trim();

    if (trimmedPw.length < 4) {
      setAdminPwError('Heslo musí mít alespoň 4 znaky.');
      return;
    }

    globalThis.CUSIIK_ADMIN_PW = trimmedPw;
    setCurrentAdminPw(trimmedPw);

    if (socket.connected) {
      socket.emit('admin:setAdminPw', {
        pw: trimmedPw,
      });
    }

    logAction('Obnovovací heslo admina bylo nastaveno.');


    setAdminPwModalVisible(false);
  };


   const muteUser = (user, option) => {
    if (!user) {
      return;
    }

    const mutedUsers = { ...getGlobalMutedUsers() };
    const secretMutedUsersMap = { ...getGlobalSecretMutedUsers() };
    const muteStartTime = Date.now();
    const muteUntilTime = muteStartTime + option.milliseconds;

    delete secretMutedUsersMap[user.id];
    delete secretMutedUsersMap[String(user.id)];
    globalThis.CUSIIK_SECRET_MUTED_USERS = secretMutedUsersMap;

    mutedUsers[user.id] = muteUntilTime;
    mutedUsers[String(user.id)] = muteUntilTime;
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

    setSecretMutedUsers({ ...secretMutedUsersMap });
    setNowTick(muteStartTime);


    if (socket.connected) {
      socket.emit('admin:secretMuteUser', {
        userId: user.id,
        enabled: false,
      });

      socket.emit('admin:muteUser', {
        userId: user.id,
        milliseconds: option.milliseconds,
      });

      socket.emit('chat:send', {
        userId: user.id,
        sender: 'system',
        text: `Uživatel ${user.name} byl umlčen na ${option.label}.`,
      });
    }

    logAction(`Uživatel ${user.name} byl umlčen na ${option.label}.`);
    setMuteModalVisible(false);
  };

  const unmuteUser = (user) => {

    if (!user) {
      return;
    }

    const mutedUsers = { ...getGlobalMutedUsers() };
    delete mutedUsers[user.id];
    delete mutedUsers[String(user.id)];
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;
    setNowTick(Date.now());

    if (socket.connected) {
      socket.emit('admin:unmuteUser', {
        userId: user.id,
      });

      socket.emit('chat:send', {
        userId: user.id,
        sender: 'system',
        text: `Uživatel ${user.name} už není umlčen.`,
      });
    }

       logAction(`Umlčení uživatele ${user.name} bylo zrušeno.`);
    setMuteModalVisible(false);
  };

  const openMuteModalForUser = (user) => {

    if (!user) {
      return;
    }

    setActionUser(user);
    setMuteModalVisible(true);
    setUserMenuVisible(false);
  };

  const unlockUserRating = (user) => {
    if (!user) {
      return;
    }

    const cleanUserId = String(user.id);

    setUnlockedRatingUsers((current) => ({
      ...current,
      [cleanUserId]: true,
    }));

    if (socket.connected) {
      socket.emit('admin:unlockRating', {
        userId: user.id,
        enabled: true,
      });
    }

    logAction(`Hodnocení uživatele ${user.name} bylo odemčeno.`);
  };

  const openRatingConfirm = (user) => {
    if (!user) {
      return;
    }

    setRatingConfirmUser(user);
    setRatingConfirmVisible(true);
  };

  const closeRatingConfirm = () => {
    setRatingConfirmVisible(false);
    setRatingConfirmUser(null);
  };

  const confirmRatingUnlock = () => {
    if (ratingConfirmUser) {
      unlockUserRating(ratingConfirmUser);
    }

    closeRatingConfirm();
  };

  const openQuickActionsModal = (user) => {
    if (!user) {
      return;
    }

    setActionUser(user);
    setQuickActionsModalVisible(true);
  };

  const closeQuickActionsModal = () => {
    setQuickActionsModalVisible(false);
  };

  const toggleSecretMute = (user) => {
    if (!user) {
      return;
    }

    const secretMutedMap = { ...getGlobalSecretMutedUsers() };
    const uid = String(user.id);
    const nextValue = !(secretMutedMap[user.id] || secretMutedMap[uid]);
    const mutedUsersMap = { ...getGlobalMutedUsers() };

    if (nextValue) {
      secretMutedMap[user.id] = true;
      secretMutedMap[uid] = true;
    } else {
      delete secretMutedMap[user.id];
      delete secretMutedMap[uid];
    }
    globalThis.CUSIIK_SECRET_MUTED_USERS = secretMutedMap;

    if (nextValue) {
      delete mutedUsersMap[user.id];
      delete mutedUsersMap[uid];
      globalThis.CUSIIK_MUTED_USERS = mutedUsersMap;
    }

    if (socket.connected) {
      socket.emit('admin:secretMuteUser', {
        userId: user.id,
        enabled: nextValue,
      });

      if (nextValue) {
        socket.emit('admin:unmuteUser', {
          userId: user.id,
        });
      }
    }

    setSecretMutedUsers({ ...secretMutedMap });

    if (nextValue) {
      const nextReadCounts = {
        ...getGlobalReadCounts(),
        [uid]: getUserMessageCount(uid),
      };
      persistReadCounts(nextReadCounts);
      setReadCounts(nextReadCounts);
    }

    setNowTick(Date.now());
    logAction(
      nextValue
        ? `Uživatel ${user.name} byl umlčen potají.`
        : `Tajné umlčení uživatele ${user.name} bylo zrušeno.`
    );


    closeUserMenu();
  };

  const changeUserColour = (user, colour) => {
    const targetUser = user || selectedUser || actionUser;

    if (!targetUser) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === targetUser.id
          ? {
              ...currentUser,
              silhouetteColour: colour,
            }
          : currentUser
      )
    );

    setSelectedUser((prev) => (prev && prev.id === targetUser.id ? { ...prev, silhouetteColour: colour } : prev));
    setActionUser((prev) => (prev && prev.id === targetUser.id ? { ...prev, silhouetteColour: colour } : prev));

    if (socket.connected) {
      socket.emit('admin:setUserColour', {
        userId: targetUser.id,
        colour,
      });
    }

      logAction(`Obrys uživatele ${targetUser.name} byl změněn.`);
    setColourModalVisible(false);
  };


  const changeUserBgColour = (user, colour) => {
    const targetUser = user || actionUser;

    if (!targetUser) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === targetUser.id
          ? {
              ...currentUser,
              bgColour: colour,
            }
          : currentUser
      )
    );

    setActionUser((prev) => (prev && prev.id === targetUser.id ? { ...prev, bgColour: colour } : prev));

    if (socket.connected) {
      socket.emit('admin:setUserBgColour', {
        userId: targetUser.id,
        colour,
      });
    }

    logAction(`Pozadí uživatele ${targetUser.name} bylo změněno.`);
    setBgColourModalVisible(false);
  };



  const setUserToFuckerAvatar = (user) => {
    if (!user) {
      return;
    }

    const nextEnabled = !Boolean(user.avatarLocked);

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? {
              ...currentUser,
              avatarIcon: nextEnabled ? 'fuckerr' : 'uzivatel',
              avatarLocked: nextEnabled,
            }
          : currentUser
      )
    );

    if (socket.connected) {
      socket.emit('admin:setUserFuckerAvatar', {
        userId: user.id,
        enabled: nextEnabled,
      });
    }

        logAction(
      nextEnabled
        ? `Uživatel ${user.name} má uzamčenou ikonku na fuckera.`
        : `Uživatel ${user.name} už nemá uzamčenou ikonku na fuckera.`
    );
  };


   const unreadUsersPreview = users
    .filter((user) => !secretMutedUsers[String(user.id)] && getUnreadCount(user.id) > 0)
    .slice(0, 5);

  const totalUnreadCount = users.reduce(
    (sum, user) => sum + (secretMutedUsers[String(user.id)] ? 0 : getUnreadCount(user.id)),
    0
  );

  return (

    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <View
        style={styles.page}
      >
        <View style={styles.window}>
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <Image source={LOGO_ICON} style={styles.titleLogoImage} resizeMode="contain" />

                        <Text style={styles.titleText}>{`room${currentUserPin}`}</Text>

                                      <View style={styles.titleStatusAnimWrap}>
               {isAdminOnline ? (
                 <OnLoopAnimation size={22} />
               ) : isAdminJob ? (
                 <JobPulseAnimation size={22} />
               ) : (
                 <OffPulseAnimation size={22} />
               )}
             </View>


            </View>


                             <View style={styles.windowButtons}>
              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={goToPinEntry}>
                  <Image source={BACK_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={[styles.windowButton, styles.windowButtonGapLeft]}>
                <Pressable style={styles.closePressable} onPress={() => setStatsModalVisible(true)}>
                  <Image source={STAT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={() => setHelpModalVisible(true)}>
                  <Image source={HELP_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={[styles.windowButton, styles.windowButtonGapLeft]}>
                <Pressable style={styles.closePressable} onPress={goToPinEntry}>
                  <Image source={MINIMIZE_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={closeApp}>
                  <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>
            </View>


          </View>

           <View style={styles.body}>
                <View style={styles.topInfoPanel}>
              <Pressable
                style={({ pressed }) => [
                  styles.topAdminIconBox,
                  {
                    backgroundColor: adminProfile?.bgColour || '#ece9d8',
                    borderTopColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderLeftColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderRightColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderBottomColor: adminProfile?.silhouetteColour || '#0b3d91',
                  },
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openAdminProfileEditor}
              >
                <AvatarIcon
                  source={getAdminIconSource(adminProfile?.icon || 'admin')}
                  iconKey={normalizeAdminIcon(adminProfile?.icon || 'admin')}
                  style={styles.topAdminIconImage}
                />

                {totalUnreadCount > 0 ? (
                  <View style={styles.totalUnreadBadge}>
                    <Text style={styles.totalUnreadBadgeText}>{totalUnreadCount}</Text>
                  </View>
                ) : null}
              </Pressable>

              <Text style={styles.topInfoAdminLabel}>GM</Text>

                          <View style={styles.unreadAvatarsRow}>
                {unreadUsersPreview.length === 0 ? (
                  <Text style={styles.noUnreadText}>- žádné nové zprávy -</Text>
                ) : null}

                {unreadUsersPreview.map((user) => {
                  const unreadCount = getUnreadCount(user.id);

                  return (
                  <UnreadAvatarPulse key={user.id} count={unreadCount}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.unreadAvatarBox,
                      {
                        backgroundColor: user.bgColour || '#dceaff',
                        borderColor: user.silhouetteColour || '#0b3d91',
                      },
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => openAdminChat(user)}
                  >
                    <Image
                      source={getUserIconSource(user.avatarIcon)}
                      style={styles.unreadAvatarImage}
                      resizeMode="contain"
                    />
                    <View style={styles.unreadAvatarBadge}>
                      <Text style={styles.unreadAvatarBadgeText}>
                        {unreadCount}
                      </Text>
                    </View>
                  </Pressable>
                  </UnreadAvatarPulse>
                  );
                })}
              </View>
            </View>


            <View style={styles.usersPanel}>
              <View style={styles.panelTitleBar}>
                <Text style={styles.panelTitleText}>{`Uživatelé v roomce (${users.length})`}</Text>
                <OnlineCountText
  count={users.filter((user) => user.online).length}
  style={styles.panelCountText}
/>

              </View>

              <ScrollView
                style={styles.usersScroll}
                contentContainerStyle={styles.usersContent}
                showsVerticalScrollIndicator={false}
              >
                {users.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>🚪</Text>
                    <Text style={styles.emptyTitle}>Roomka je prázdná</Text>
                    <Text style={styles.emptyText}>
                      Všichni uživatelé byli vykopnuti nebo se zatím nikdo nepřipojil.
                    </Text>
                  </View>
                ) : (
                  [...users]
                    .sort((a, b) => {
                      if (a.online !== b.online) {
                        return a.online ? -1 : 1;
                      }

                      return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
                    })
                    .map((user) => {
                    const unreadCount = getUnreadCount(user.id);
                    const isUserMuted = getMuteMsLeft(user.id, nowTick) > 0;
                    const isUserSecretMuted = Boolean(secretMutedUsers[user.id]);
                    const isUserFuckerLocked = Boolean(user.avatarLocked);
                    const userRowDimmedStyle = isUserSecretMuted
                      ? styles.userRowSecretMutedOpacity
                      : !user.online
                        ? styles.userRowOfflineOpacity
                        : null;

                    return (
                  <SwipeToUnlockRow
                    key={user.id}
                    disabled={isUserSecretMuted}
                    onUnlock={() => openRatingConfirm(user)}
                  >
                  <View
                        style={[
                          styles.userRow,
                          isUserSecretMuted
                            ? styles.userRowSecretMuted
                            : isUserMuted
                              ? styles.userRowMuted
                              : null,
                        ]}
                      >

                                                          <Pressable
                          style={({ pressed }) => [
                            styles.userInfo,
                            userRowDimmedStyle,
                            pressed && styles.userInfoPressed,
                          ]}
                          onPress={() => openAdminChat(user)}
                          onLongPress={() => openUserMenu(user)}
                          delayLongPress={260}
                        >
                          <View style={styles.userIconWrap}>
                            <View
                              style={[
                                styles.userIconBox,
                                {
                                  backgroundColor: user.bgColour || '#dceaff',
                                  borderTopColor: user.silhouetteColour || '#0b3d91',
                                  borderLeftColor: user.silhouetteColour || '#0b3d91',
                                  borderRightColor: user.silhouetteColour || '#0b3d91',
                                  borderBottomColor: user.silhouetteColour || '#0b3d91',
                                },
                              ]}
                            >
                              <Image
                                source={getUserIconSource(user.avatarIcon)}
                                style={styles.userIconImage}
                                resizeMode="contain"
                              />
                            </View>

                            {unreadCount > 0 ? (
                              <View style={styles.userIconBadgeWrap}>
                                <UnreadBadge count={unreadCount} isSecret={isUserSecretMuted} />
                              </View>
                            ) : null}
                          </View>

                          <View style={styles.userTextBox}>
                            <View style={styles.userNameRow}>
                              {renderUserNameWithMute(user, styles.userName)}
                              {renderMuteTag(user)}
                            </View>

                            <View style={styles.userStatusRow}>
                              <Text
                                style={[
                                  styles.userStatus,
                                  user.online ? styles.userStatusOnline : null,
                                ]}
                              >
                                {formatLastSeen(user, nowTick)}
                              </Text>
                            </View>
                          </View>
                        </Pressable>

                                            <Pressable
                          style={({ pressed }) => [
                            styles.kickButton,
                            userRowDimmedStyle,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => openQuickActionsModal(user)}
                        >
                          <Image
                            source={KICK_ICON}
                            style={styles.kickButtonIcon}
                            resizeMode="contain"
                          />
                        </Pressable>

                      </View>
                  </SwipeToUnlockRow>

                    );
                  })
                )}
              </ScrollView>
            </View>

                     <Pressable
              style={({ pressed }) => [
                styles.actionBox,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={() => setActionHistoryExpanded((prev) => !prev)}
            >
              <Text style={styles.actionText}>
                {actionHistory.length > 0
                  ? actionHistory[0]
                  : `Status: ${getAdminStatusLabel()}`}
              </Text>

              {actionHistoryExpanded && actionHistory.length > 1 ? (
                <View style={styles.actionHistoryList}>
                  {actionHistory.slice(1, 10).map((entry, index) => (
                    <Text key={index} style={styles.actionHistoryItem}>
                      {entry}
                    </Text>
                  ))}
                </View>
              ) : null}
            </Pressable>

            <View style={styles.smallActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.smallActionButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openPreparationChecklist}
              >
                <Text style={styles.smallActionButtonTitle}>Příprava</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.smallActionButton,
                  styles.smallActionButtonWide,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={() => {
                  setAnnouncementTarget('all');
                  setAnnouncementUserIds([]);
                  setBroadcastMode('announcement');
                  setBroadcastMessage('');
                  setBroadcastError('');
                  setBroadcastModalVisible(true);
                }}
              >
                <Text style={styles.smallActionButtonTitle}>Všem</Text>
              </Pressable>
            </View>

            <View style={styles.bottomButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.bigActionButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openChangeModal}
              >
                <Text style={styles.bigActionButtonTitle}>HARD ROOM RESET</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.bigActionButton,
                  isAdminOnline
                    ? styles.statusOptionOn
                    : isAdminJob
                      ? styles.statusOptionJob
                      : styles.statusOptionOff,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={toggleAdminStatus}
              >
                <View style={styles.statusOptionTop}>
                  <View style={styles.adminStatusAnimWrap}>
                    <StatusAnimation status={adminStatus} size={18} />
                  </View>
                  <Text style={styles.bigActionButtonTitle}>
                    Admin status: {getAdminStatusLabel()}
                  </Text>
                </View>
              </Pressable>
            </View>


          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Připojeno jako admin</Text>
            <Text style={styles.statusText}>
              {`${connectionText} | Status: ${getAdminStatusLabel()}`}
            </Text>
          </View>
        </View>

        <Modal
          visible={preparationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closePreparationChecklist}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Příprava</Text>

                <Pressable style={styles.modalCloseButton} onPress={closePreparationChecklist}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Vyber uživatele pro přípravu:</Text>

                <ScrollView style={styles.announcementUsersList} nestedScrollEnabled>
                  {users.length === 0 ? (
                    <View style={styles.smallEmptyBox}>
                      <Text style={styles.smallEmptyText}>Žádní uživatelé v roomce.</Text>
                    </View>
                  ) : (
                    users.map((user) => {
                      const checked = preparationUserIds.includes(String(user.id));
                      return (
                        <Pressable
                          key={user.id}
                          style={({ pressed }) => [
                            styles.announcementUserRow,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => togglePreparationUser(user.id)}
                        >
                          <View style={[styles.announcementCheckbox, checked && styles.announcementCheckboxChecked]}>
                            <Text style={styles.announcementCheckmark}>{checked ? '✓' : ''}</Text>
                          </View>
                          <Text style={styles.announcementUserName}>{user.name}</Text>
                          <Text style={styles.selectionStatusText}>{user.online ? 'online' : 'offline'}</Text>
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closePreparationChecklist}
                  >
                    <Text style={styles.modalButtonText}>Hotovo</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={broadcastModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeBroadcastModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Zpráva a oznámení</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeBroadcastModal}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Vyber typ a komu se má zpráva poslat:</Text>

                <View style={styles.announcementTargetRow}>
                  {[
                    { key: 'message', label: 'Zpráva' },
                    { key: 'announcement', label: 'Oznámení' },
                  ].map((option) => (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.announcementTargetButton,
                        broadcastMode === option.key && styles.announcementTargetButtonActive,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => {
                        setBroadcastMode(option.key);
                        setBroadcastError('');
                      }}
                    >
                      <Text style={styles.modalButtonText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.announcementTargetRow}>
                  {[
                    { key: 'all', label: 'Všem' },
                    { key: 'selected', label: 'Vybraným' },
                  ].map((option) => (
                    <Pressable
                      key={option.key}
                      style={({ pressed }) => [
                        styles.announcementTargetButton,
                        announcementTarget === option.key && styles.announcementTargetButtonActive,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => {
                        setAnnouncementTarget(option.key);
                        setBroadcastError('');
                      }}
                    >
                      <Text style={styles.modalButtonText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {announcementTarget === 'selected' ? (
                  <ScrollView style={styles.announcementUsersList} nestedScrollEnabled>
                    {users.map((user) => {
                      const checked = announcementUserIds.includes(String(user.id));
                      return (
                        <Pressable
                          key={user.id}
                          style={({ pressed }) => [
                            styles.announcementUserRow,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => toggleAnnouncementUser(user.id)}
                        >
                          <View style={[styles.announcementCheckbox, checked && styles.announcementCheckboxChecked]}>
                            <Text style={styles.announcementCheckmark}>{checked ? '✓' : ''}</Text>
                          </View>
                          <Text style={styles.announcementUserName}>{user.name}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <TextInput
                  value={broadcastMessage}
                  onChangeText={(value) => {
                    setBroadcastError('');
                    setBroadcastMessage(value);
                  }}
                  style={[styles.modalInput, styles.broadcastInput]}
                  placeholder={broadcastMode === 'announcement' ? 'Napiš oznámení...' : 'Napiš zprávu...'}
                  placeholderTextColor="#666666"
                  autoFocus
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />

                {broadcastError ? (
                  <Text style={styles.errorText}>{broadcastError}</Text>
                ) : null}

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={sendBroadcastMessage}
                  >
                    <Text style={styles.modalButtonText}>
                      {broadcastMode === 'announcement' ? 'Zobrazit oznámení' : 'Odeslat zprávu'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeBroadcastModal}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={kickPinModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeKickPinModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Kick uživatele</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeKickPinModal}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Nový PIN pro {actionUser?.name || 'uživatele'}:
                </Text>

                <PinDots length={kickPin.length} />

                <NumericKeypad
                  value={kickPin}
                  onChange={(value) => {
                    setKickPinError('');
                    setKickPin(value);
                  }}
                />

                {kickPinError ? <Text style={styles.errorText}>{kickPinError}</Text> : null}

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [styles.modalButton, pressed && styles.xpButtonPressed]}
                    onPress={confirmKickUser}
                  >
                    <Text style={styles.modalButtonText}>Kicknout a nastavit PIN</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [styles.modalButton, pressed && styles.xpButtonPressed]}
                    onPress={closeKickPinModal}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={quickActionsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeQuickActionsModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Akce uživatele</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeQuickActionsModal}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.selectedUserText}>
                  {actionUser ? actionUser.name : ''}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionMute,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    closeQuickActionsModal();
                    openMuteModalForUser(actionUser);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>Umlčet</Text>
                  <Text style={styles.settingsOptionText}>
                    Dočasně zakáže uživateli psát zprávy.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionSecretMute,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    closeQuickActionsModal();
                    toggleSecretMute(actionUser);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>
                    {actionUser && secretMutedUsers[actionUser.id] ? 'Zrušit umlčení potají' : 'Umlčet potají'}
                  </Text>
                  <Text style={styles.settingsOptionText}>
                    Uživatel neuvidí, že je umlčený.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionFucker,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    closeQuickActionsModal();
                    setUserToFuckerAvatar(actionUser);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>
                    {actionUser?.avatarLocked ? 'Zrušit fucker ikonku' : 'Fucker'}
                  </Text>
                  <Text style={styles.settingsOptionText}>
                    Uzamkne uživateli ikonku na fuckera.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionKick,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    closeQuickActionsModal();
                    openKickPinModal(actionUser);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>Kick</Text>
                  <Text style={styles.settingsOptionText}>
                    Vyhodí uživatele z roomky a nabídne nový PIN.
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={userMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={closeUserMenu}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>
                  Nastavení uživatele
                </Text>

                <Pressable style={styles.modalCloseButton} onPress={closeUserMenu}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.selectedUserText}>
                  {actionUser ? actionUser.name : ''}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => openRenameModal(actionUser)}
                >
                  <Text style={styles.settingsOptionTitle}>Přejmenovat</Text>
                  <Text style={styles.settingsOptionText}>
                    Změní jméno vybraného uživatele.
                  </Text>
                </Pressable>

                               <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    setBgColourModalVisible(true);
                    setUserMenuVisible(false);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>BG (pozadí)</Text>
                  <Text style={styles.settingsOptionText}>
                    Změní barvu pozadí ikonky uživatele.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    setColourModalVisible(true);
                    setUserMenuVisible(false);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>Obrys</Text>
                  <Text style={styles.settingsOptionText}>
                    Změní obrys uživatele, který uvidí admin i uživatel.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                    onPress={() => openKickPinModal(actionUser)}
                >

                  <Text style={styles.settingsOptionTitle}>Kick</Text>
                  <Text style={styles.settingsOptionText}>
                    Vyhodí uživatele z roomky a nabídne nový PIN (výchozí 0008).
                  </Text>
                </Pressable>

                {getMuteMsLeft(actionUser?.id, nowTick) > 0 ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.settingsOption,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => {
                      unmuteUser(actionUser);
                      closeUserMenu();
                    }}
                  >
                    <Text style={styles.settingsOptionTitle}>Zrušit umlčení</Text>
                    <Text style={styles.settingsOptionText}>
                      Umožní uživateli psát normálně.
                    </Text>
                  </Pressable>
                ) : null}

              </View>
            </View>
          </View>
        </Modal>

         <Modal
          visible={muteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMuteModalVisible(false)}
        >
          <View style={[styles.modalOverlay, styles.muteModalOverlay]}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Umlčet uživatele</Text>


                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setMuteModalVisible(false)}
                >
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Vyber délku umlčení:</Text>
                <Text style={styles.selectedUserText}>
                  {selectedUser ? selectedUser.name : actionUser ? actionUser.name : ''}
                </Text>

                {getMuteMsLeft(actionUser?.id, nowTick) > 0 ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Uživatel je aktuálně umlčen ještě na {formatMuteLeft(actionUser?.id, nowTick)}.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.muteGrid}>
                  {MUTE_OPTIONS.map((option) => (
                    <Pressable
                      key={option.label}
                      style={({ pressed }) => [
                        styles.muteOptionButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => muteUser(actionUser, option)}
                    >
                      <Text style={styles.muteOptionText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  {getMuteMsLeft(actionUser?.id, nowTick) > 0 ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => {
                        unmuteUser(actionUser);
                        setMuteModalVisible(false);
                      }}
                    >
                      <Text style={styles.modalButtonText}>Zrušit mlčení</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => setMuteModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Zavřít</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={colourModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setColourModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Změna obrysu</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setColourModalVisible(false)}
                >
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Vyber barvu obrysu pro uživatele:</Text>
                <Text style={styles.selectedUserText}>
                  {actionUser ? actionUser.name : ''}
                </Text>

                             <View style={styles.colourGrid}>
                  {USER_COLOURS.map((colour) => (
                    <Pressable
                      key={colour.value}
                      style={({ pressed }) => [
                        styles.colourButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => changeUserColour(actionUser, colour.value)}
                    >
                      <View
                        style={[
                          styles.colourPreview,
                          { backgroundColor: colour.value },
                        ]}
                      />
                      <Text style={styles.colourButtonText}>{colour.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={bgColourModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBgColourModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Změna pozadí (BG)</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setBgColourModalVisible(false)}
                >
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Vyber barvu pozadí pro uživatele:</Text>
                <Text style={styles.selectedUserText}>
                  {actionUser ? actionUser.name : ''}
                </Text>

                <View style={styles.colourGrid}>
                  {USER_COLOURS.map((colour) => (
                    <Pressable
                      key={colour.value}
                      style={({ pressed }) => [
                        styles.colourButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => changeUserBgColour(actionUser, colour.value)}
                    >
                      <View
                        style={[
                          styles.colourPreview,
                          { backgroundColor: colour.value },
                        ]}
                      />
                      <Text style={styles.colourButtonText}>{colour.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={renameModalVisible}

          transparent
          animationType="fade"
          onRequestClose={closeRenameModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Přejmenovat uživatele</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeRenameModal}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Nové jméno uživatele:</Text>

                <TextInput
                  value={newUserName}
                  onChangeText={setNewUserName}
                  style={styles.modalInput}
                  placeholder="Zadej nové jméno"
                  placeholderTextColor="#666666"
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={saveRename}
                />

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={saveRename}
                  >
                    <Text style={styles.modalButtonText}>Uložit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeRenameModal}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

                <Modal
          visible={adminEditModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAdminProfileEditor}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Nastavení admina</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeAdminProfileEditor}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => setAdminIconModalVisible(true)}
                >
                  <Text style={styles.settingsOptionTitle}>Ikonka</Text>
                  <Text style={styles.settingsOptionText}>
                    Vyber si ikonku, kterou uvidí uživatel v chatu.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => setAdminOutlineModalVisible(true)}
                >
                  <Text style={styles.settingsOptionTitle}>Obrys</Text>
                  <Text style={styles.settingsOptionText}>
                    Barva obrysu tvé ikonky (20 barev na výběr).
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => setAdminFillModalVisible(true)}
                >
                  <Text style={styles.settingsOptionTitle}>Výplň</Text>
                  <Text style={styles.settingsOptionText}>
                    Barva pozadí tvé ikonky (pár barev na výběr).
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={openAdminPinModal}
                >
                  <Text style={styles.settingsOptionTitle}>Admin PIN</Text>
                  <Text style={styles.settingsOptionText}>
                    Nastavíš PIN pro vstup do admin panelu.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={openAdminPwModal}
                >
                  <Text style={styles.settingsOptionTitle}>Admin PW</Text>
                  <Text style={styles.settingsOptionText}>
                    Obnovovací heslo pro případ zapomenutého PINu.
                  </Text>
                </Pressable>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeAdminProfileEditor}
                  >
                    <Text style={styles.modalButtonText}>Zavřít</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={adminPinModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminPinModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Admin PIN</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setAdminPinModalVisible(false)}
                >
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Nastavit nový admin PIN:</Text>

                <PinDots length={newAdminPin.length} />

                <NumericKeypad
                  value={newAdminPin}
                  onChange={(value) => {
                    setAdminPinError('');
                    setNewAdminPin(value);
                  }}
                />

                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    Aktuální admin PIN: {currentAdminPin}
                  </Text>
                </View>

                {adminPinError ? (
                  <Text style={styles.errorText}>{adminPinError}</Text>
                ) : null}

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={saveNewAdminPin}
                  >
                    <Text style={styles.modalButtonText}>Uložit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => setAdminPinModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Zpět</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={adminPwModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminPwModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Admin PW (obnovovací heslo)</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setAdminPwModalVisible(false)}
                >
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Nastav heslo, kterým se dostaneš zpět do admin panelu, pokud zapomeneš PIN:
                </Text>

                <TextInput
                  value={newAdminPw}
                  onChangeText={(value) => {
                    setAdminPwError('');
                    setNewAdminPw(value);
                  }}
                  style={styles.modalInput}
                  placeholder="Zadej obnovovací heslo"
                  placeholderTextColor="#666666"
                  autoFocus
                  secureTextEntry
                  maxLength={40}
                />

                     {currentAdminPw ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Obnovovací heslo je již nastaveno.
                    </Text>
                  </View>
                ) : null}

                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    PASSWORD SI ZAPAMATUJ! Bude po tobě chtít ověření.
                  </Text>
                  <Text style={styles.warningText}>
                    Když zapomeneš PIN, pomocí základního 8831 začneš znovu.
                  </Text>
                </View>

                {adminPwError ? (
                  <Text style={styles.errorText}>{adminPwError}</Text>
                ) : null}


                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={saveNewAdminPw}
                  >
                    <Text style={styles.modalButtonText}>Uložit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => setAdminPwModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Zpět</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>


        <Modal
          visible={adminIconModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminIconModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Výběr admin ikonky</Text>

                <Pressable style={styles.modalCloseButton} onPress={() => setAdminIconModalVisible(false)}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.adminIconGrid}>
                  {ADMIN_ICON_OPTIONS.map((iconOption) => {
                    const isActive = normalizeAdminIcon(adminProfile?.icon || 'admin') === iconOption.key;

                    return (
                      <Pressable
                        key={iconOption.key}
                        style={({ pressed }) => [
                          styles.adminIconButton,
                          isActive && styles.adminIconButtonActive,
                          pressed && styles.xpButtonPressed,
                        ]}
                        onPress={() => updateAdminIcon(iconOption.key)}
                      >
                        <View style={styles.adminIconThumb}>
                          <AvatarIcon
                            source={getAdminIconSource(iconOption.key)}
                            iconKey={iconOption.key}
                            style={styles.adminIconThumbImage}
                          />
                        </View>
                        <Text style={styles.adminIconLabel}>{iconOption.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={adminOutlineModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminOutlineModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Výběr obrysu admina</Text>

                <Pressable style={styles.modalCloseButton} onPress={() => setAdminOutlineModalVisible(false)}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.colourGrid}>
                  {ADMIN_OUTLINE_COLOURS.map((colour) => (
                    <Pressable
                      key={colour.value}
                      style={({ pressed }) => [
                        styles.colourButton,
                        (adminProfile?.silhouetteColour || '#0b3d91') === colour.value && styles.adminIconButtonActive,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => updateAdminOutlineColour(colour.value)}
                    >
                      <View
                        style={[
                          styles.colourPreview,
                          { backgroundColor: colour.value },
                        ]}
                      />
                      <Text style={styles.colourButtonText}>{colour.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={adminFillModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAdminFillModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Výběr výplně admina</Text>

                <Pressable style={styles.modalCloseButton} onPress={() => setAdminFillModalVisible(false)}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.colourGrid}>
                  {ADMIN_FILL_COLOURS.map((colour) => (
                    <Pressable
                      key={colour.value}
                      style={({ pressed }) => [
                        styles.colourButton,
                        (adminProfile?.bgColour || '#ece9d8') === colour.value && styles.adminIconButtonActive,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => updateAdminFillColour(colour.value)}
                    >
                      <View
                        style={[
                          styles.colourPreview,
                          { backgroundColor: colour.value },
                        ]}
                      />
                      <Text style={styles.colourButtonText}>{colour.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </Modal>

               <Modal
          visible={changeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeChangeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalWindow, styles.modalWindowDangerDouble]}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>
                  {hardResetStep === 'pin' && 'HARD ROOM RESET'}
                  {hardResetStep === 'confirm1' && 'HARD ROOM RESET - potvrzení 1/2'}
                  {hardResetStep === 'confirm2' && 'HARD ROOM RESET - finální potvrzení'}
                </Text>

                <Pressable style={styles.modalCloseButton} onPress={closeChangeModal}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              {hardResetStep === 'pin' ? (
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Nový 4místný PIN pro uživatele:</Text>

                  <PinDots length={newPin.length} />

                  <NumericKeypad
                    value={newPin}
                    onChange={(value) => {
                      setChangeError('');
                      setNewPin(value);
                    }}
                  />

                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Po potvrzení se nastaví nový PIN pro všechny uživatele, všichni uživatelé budou kicknuti z roomky a smazáni!
                    </Text>
                    <Text style={styles.warningText}>Opravdu chceš toto udělat?</Text>
                    <Text style={styles.warningText}>
                      Informoval jsi všechny důležité o novém PINu?
                    </Text>
                  </View>

                  {changeError ? (
                    <Text style={styles.errorText}>{changeError}</Text>
                  ) : null}

                  <View style={styles.modalButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={saveChangeAndKickUsers}
                    >
                      <Text style={styles.modalButtonText}>Potvrdit HARD ROOM RESET</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={closeChangeModal}
                    >
                      <Text style={styles.modalButtonText}>Zrušit</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {hardResetStep === 'confirm1' ? (
                <View style={styles.modalBody}>
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Po potvrzení se nastaví nový PIN: {pendingHardResetPin || '----'}
                    </Text>
                    <Text style={styles.warningText}>
                      Všichni uživatelé budou kicknuti a roomka se resetuje.
                    </Text>
                  </View>

                  <View style={styles.modalButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={confirmHardResetStep1}
                    >
                      <Text style={styles.modalButtonText}>Pokračovat</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={goBackFromHardResetStep1}
                    >
                      <Text style={styles.modalButtonText}>Zpět</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {hardResetStep === 'confirm2' ? (
                <View style={styles.modalBody}>
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>Tento krok je nevratný.</Text>
                    <Text style={styles.warningText}>Opravdu potvrdit HARD ROOM RESET?</Text>
                  </View>

                  <View style={styles.modalButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={confirmHardResetFinal}
                    >
                      <Text style={styles.modalButtonText}>ANO, potvrdit</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={() => setHardResetStep('confirm1')}
                    >
                      <Text style={styles.modalButtonText}>NE</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
        <Modal
          visible={helpModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Nápověda</Text>

                <Pressable style={styles.modalCloseButton} onPress={() => setHelpModalVisible(false)}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.settingsOptionTitle}>Tlačítka vpravo nahoře</Text>
                <Text style={styles.settingsOptionText}>
                  ← návrat na přihlašovací obrazovku. ? tato nápověda. _ minimalizace/odhlášení. × zavření aplikace.
                </Text>

                <View style={{ height: 12 }} />

                <Text style={styles.settingsOptionTitle}>Nastavení admina</Text>
                <Text style={styles.settingsOptionText}>
                  Klepnutím na ikonku admina vlevo nahoře otevřeš nastavení: ikonka, obrys, Admin PIN a Admin PW.
                </Text>

                <View style={{ height: 12 }} />

                <Text style={styles.settingsOptionTitle}>Nastavení uživatele</Text>
                <Text style={styles.settingsOptionText}>
                  Klepnutí na záznam uživatele otevře chat. Podržení záznamu otevře nastavení uživatele (přejmenování, barvy, kick).
                </Text>

                <View style={{ height: 12 }} />

                <Text style={styles.settingsOptionTitle}>Tlačítka u uživatele (vpravo)</Text>
                <Text style={styles.settingsOptionText}>
                  Oko: klepnutí umlčí uživatele, podržení skryje umlčení potají. Fucker ikonka: uzamkne uživateli avatar. Stop ikonka: kick z roomky.
                </Text>

                <View style={{ height: 12 }} />

                <Text style={styles.settingsOptionTitle}>Tlačítka dole</Text>
                <Text style={styles.settingsOptionText}>
                  HARD ROOM RESET vymaže roomku a nastaví nový PIN. Admin status přepíná ON / JOB / OFF.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={statsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setStatsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Hodnocení uživatelů</Text>

                <Pressable style={styles.modalCloseButton} onPress={() => setStatsModalVisible(false)}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Podržením a přetažením uživatele doleva odemkneš jeho hodnocení.
                </Text>

                {Object.keys(unlockedRatingUsers).length === 0 ? (
                  <View style={styles.smallEmptyBox}>
                    <Text style={styles.smallEmptyText}>
                      Zatím nemáš odemčené hodnocení žádného uživatele.
                    </Text>
                  </View>
                ) : (
                  users
                    .filter((user) => unlockedRatingUsers[String(user.id)])
                    .map((user) => {
                      const rating = userRatings[String(user.id)];

                      return (
                        <View key={user.id} style={styles.settingsUserRow}>
                          <View
                            style={[
                              styles.smallUserIconBox,
                              {
                                backgroundColor: user.bgColour || '#dceaff',
                                borderTopColor: user.silhouetteColour || '#0b3d91',
                                borderLeftColor: user.silhouetteColour || '#0b3d91',
                                borderRightColor: user.silhouetteColour || '#0b3d91',
                                borderBottomColor: user.silhouetteColour || '#0b3d91',
                              },
                            ]}
                          >
                            <Image
                              source={getUserIconSource(user.avatarIcon)}
                              style={styles.smallUserIconImage}
                              resizeMode="contain"
                            />
                          </View>

                          <View style={styles.settingsUserTextBox}>
                            <Text style={styles.settingsUserName}>{user.name}</Text>
                            <Text style={styles.settingsUserSubText}>
                              {rating
                                ? `Charisma: ${rating.charisma ?? '-'}/10  •  Štěstí: ${rating.stesti ?? '-'}/10`
                                : 'Čeká na odeslání hodnocení od uživatele...'}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal
          visible={ratingConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={closeRatingConfirm}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Odemknout hodnocení</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeRatingConfirm}>
                  <Image source={EXIT_ICON} style={styles.modalCloseButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Opravdu chceš odemknout hodnocení uživateli?
                </Text>

                <Text style={styles.selectedUserText}>
                  {ratingConfirmUser ? ratingConfirmUser.name : ''}
                </Text>

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={confirmRatingUnlock}
                  >
                    <Text style={styles.modalButtonText}>Ano, odemknout</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeRatingConfirm}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

                 </View>
    </SafeAreaView>
  );
};



export default AdminPin;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ece9d8',
  },

  page: {
    flex: 1,
    backgroundColor: '#ece9d8',
  },

  window: {
    flex: 1,
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderColor: '#0754d8',
  },

  titleBar: {
    height: 38,
    backgroundColor: '#0a5be7',
    borderBottomWidth: 2,
    borderBottomColor: '#003f9e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 5,
  },

  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  titleLogoImage: {
    width: 20,
    height: 20,
    marginRight: 7,
  },

  titleText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
    textShadowColor: '#00245c',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  windowButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },

      windowButton: {
    width: 22,
    height: 22,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  windowButtonGapLeft: {
    marginLeft: 16,
  },

  windowButtonIcon: {
    width: 25,
    height: 25,
  },


  closePressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    padding: 10,
  },

  topInfoPanel: {
    backgroundColor: '#d6d3c3',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topInfoText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },

  pinText: {
    color: '#003c9e',
    fontWeight: '900',
  },

  adminStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminStatusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginRight: 6,
  },

  usersPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
  },

  panelTitleBar: {
    minHeight: 34,
    backgroundColor: '#d6d3c3',
    borderBottomWidth: 1,
    borderBottomColor: '#aaa793',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  panelTitleText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  panelCountText: {
    color: '#000c59',
    fontSize: 12,
    fontWeight: '900',
  },


  usersScroll: {
    flex: 1,
  },

  usersContent: {
    padding: 10,
    paddingBottom: 14,
    flexGrow: 1,
  },

   userRow: {
    width: '100%',
    minHeight: 66,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },


  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  userInfoPressed: {
    opacity: 0.7,
  },

  unreadBadgeSlot: {
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  userIconWrap: {
    position: 'relative',
    marginRight: 10,
  },

  userIconBadgeWrap: {
    position: 'absolute',
    top: -8,
    right: -8,
  },

  userIconBox: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  userIconImage: {
    width: 26,
    height: 26,
  },

  userTextAndBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  userTextBox: {
    flex: 1,
  },

  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  userName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 3,
  },

  mutedMinutesText: {
    color: '#c46a00',
    fontSize: 15,
    fontWeight: '900',
  },

  secretMutedText: {
    color: '#7a00cc',
    fontSize: 12,
    fontWeight: '900',
  },

  topInfoLeftColumn: {
    flex: 1,
    paddingRight: 10,
  },

  topInfoUnreadText: {
    color: '#8a4d00',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
    flexShrink: 1,
  },

  unreadBadge: {
    backgroundColor: '#ffd7d7',
    borderWidth: 1,
    borderColor: '#a80000',
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
    marginBottom: 3,
  },

  unreadBadgeText: {
    color: '#8a0000',
    fontSize: 10,
    fontWeight: '900',
  },

  userStatus: {
    color: '#333333',
    fontSize: 12,
  },

  userStatusOnline: {
    color: '#0b7a16',
    fontWeight: '900',
  },

  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  muteTagText: {
    color: '#8a4d00',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 6,
  },

  muteTagSecretText: {
    color: '#7a00cc',
    fontSize: 12,
    fontWeight: '900',
    marginRight: 6,
  },

  muteTagInline: {
    marginLeft: 6,
  },


  gearButton: {
    width: 38,
    height: 34,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyeToggleButton: {
    width: 38,
    height: 34,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  eyeToggleButtonActive: {
    backgroundColor: '#e8c6ff',
    borderTopColor: '#b67ae8',
    borderLeftColor: '#b67ae8',
    borderRightColor: '#5d1f85',
    borderBottomColor: '#5d1f85',
  },

   eyeToggleButtonMuted: {
    backgroundColor: '#ffd7d7',
    borderTopColor: '#ff8a8a',
    borderLeftColor: '#ff8a8a',
    borderRightColor: '#a80000',
    borderBottomColor: '#a80000',
  },


  eyeToggleIcon: {
    width: 20,
    height: 20,
  },

  fuckerButton: {
    width: 38,
    height: 34,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  fuckerButtonActive: {
    borderTopColor: '#9af5a8',
    borderLeftColor: '#9af5a8',
    borderRightColor: '#1d7f2c',
    borderBottomColor: '#1d7f2c',
    backgroundColor: '#d7ffd8',
  },

  fuckerButtonIcon: {
    width: 20,
    height: 20,
  },

  gearButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },

  emptyBox: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyText: {
    color: '#333333',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  actionBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },

  actionText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  smallActionRow: {
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  smallActionButton: {
    width: 120,
    minHeight: 34,
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#6b6b6b',
    borderBottomColor: '#6b6b6b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  smallActionButtonWide: {
    width: 150,
  },

  smallActionButtonTitle: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  bottomButtons: {
    paddingTop: 6,
    flexDirection: 'row',
  },

  broadcastButtonsRow: {
    flexDirection: 'row',
    paddingTop: 10,
  },

  bottomButton: {
    flex: 1,
    height: 42,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  bottomButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  xpButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  statusBar: {
    height: 25,
    backgroundColor: '#d6d3c3',
    borderTopWidth: 1,
    borderTopColor: '#aaa793',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  statusText: {
    color: '#333333',
    fontSize: 11,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },

  muteModalOverlay: {
    justifyContent: 'flex-start',
    paddingTop: 160,
  },


  modalWindow: {
    width: '100%',
    maxWidth: 410,
    maxHeight: '86%',
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    elevation: 4,
  },

  modalWindowDangerSingle: {
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
  },

  modalWindowDangerDouble: {
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
    shadowColor: '#a80000',
    shadowOpacity: 0.2,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  modalTitleBar: {
    height: 34,
    backgroundColor: '#0058d8',
    borderBottomWidth: 2,
    borderBottomColor: '#003f9e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 5,
  },

  modalTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  modalCloseButton: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 19,
  },

  modalCloseButtonIcon: {
    width: 22,
    height: 22,
  },

  modalBody: {
    padding: 16,
  },

  modalLabel: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },

  modalInput: {
    height: 42,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 14,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderTopColor: '#6e6e6e',
    borderLeftColor: '#6e6e6e',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    marginBottom: 12,
  },

  broadcastInput: {
    height: 110,
    paddingTop: 10,
  },

  announcementTargetRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },

  announcementTargetButton: {
    flex: 1,
    minHeight: 38,
    marginHorizontal: 3,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  announcementTargetButtonActive: {
    backgroundColor: '#dceaff',
    borderColor: '#245aa8',
  },

  announcementUsersList: {
    maxHeight: 180,
    marginBottom: 10,
    borderWidth: 2,
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#ffffff',
  },

  announcementUserRow: {
    minHeight: 42,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d6d3c3',
  },

  announcementCheckbox: {
    width: 22,
    height: 22,
    marginRight: 9,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  announcementCheckboxChecked: {
    backgroundColor: '#dceaff',
  },

  announcementCheckmark: {
    color: '#003c9e',
    fontSize: 16,
    fontWeight: '900',
  },

  announcementUserName: {
    flex: 1,
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  selectionStatusText: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },

  warningBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    padding: 8,
    marginBottom: 10,
  },

  warningText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorText: {
    color: '#b00000',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  modalButton: {
    minWidth: 88,
    height: 36,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginLeft: 10,
  },

  modalButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  statusOption: {
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

    statusOptionOn: {
    borderTopColor: '#9af5a8',
    borderLeftColor: '#9af5a8',
    borderRightColor: '#1d7f2c',
    borderBottomColor: '#1d7f2c',
  },

  statusOptionJob: {
    borderTopColor: '#ffd699',
    borderLeftColor: '#ffd699',
    borderRightColor: '#a85c00',
    borderBottomColor: '#a85c00',
  },

  statusOptionOff: {
    borderTopColor: '#ff8a8a',
    borderLeftColor: '#ff8a8a',
    borderRightColor: '#a80000',
    borderBottomColor: '#a80000',
  },

  bigActionButton: {
    flex: 1,
    minHeight: 54,
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#6b6b6b',
    borderBottomColor: '#6b6b6b',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingHorizontal: 8,
  },

  bigActionButtonTitle: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },


  statusOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginRight: 8,
  },

  statusDotOn: {
    backgroundColor: '#28c840',
  },

  statusDotOff: {
    backgroundColor: '#ff3b30',
  },

  statusDotJob: {
    backgroundColor: '#f5a623',
  },

  statusOptionTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },

  statusOptionText: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 17,
  },

  settingsOption: {
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  settingsOptionTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  settingsOptionText: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 17,
  },

  settingsOptionMute: {
    borderTopColor: '#ff8a8a',
    borderLeftColor: '#ff8a8a',
    borderRightColor: '#a80000',
    borderBottomColor: '#a80000',
  },

  settingsOptionSecretMute: {
    borderTopColor: '#b67ae8',
    borderLeftColor: '#b67ae8',
    borderRightColor: '#5d1f85',
    borderBottomColor: '#5d1f85',
  },

  settingsOptionFucker: {
    borderTopColor: '#9af5a8',
    borderLeftColor: '#9af5a8',
    borderRightColor: '#1d7f2c',
    borderBottomColor: '#1d7f2c',
  },

  settingsOptionKick: {
    borderTopColor: '#4d4d4d',
    borderLeftColor: '#4d4d4d',
    borderRightColor: '#000000',
    borderBottomColor: '#000000',
  },

  userRowMuted: {
    borderColor: '#c46a00',
  },

   userRowSecretMuted: {
    borderColor: '#9c4dcc',
  },

  userRowSecretMutedOpacity: {
    opacity: 0.9,
  },

  userRowOfflineOpacity: {
    opacity: 0.6,
  },


  settingsList: {
    maxHeight: 360,
  },

  settingsUserRow: {
    minHeight: 58,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallUserIconBox: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  smallUserIconImage: {
    width: 22,
    height: 22,
  },

  settingsUserTextBox: {
    flex: 1,
  },

  settingsUserName: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  settingsUserSubText: {
    color: '#333333',
    fontSize: 12,
    marginTop: 2,
  },

  smallEmptyBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    padding: 14,
    marginBottom: 10,
  },

  smallEmptyText: {
    color: '#333333',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },

  confirmIcon: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmTitle: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmUserName: {
    color: '#003c9e',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },

  selectedUserText: {
    color: '#003c9e',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },

  muteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  muteOptionButton: {
    width: '48%',
    height: 42,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  muteOptionText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  colourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  colourButton: {
    width: '48%',
    minHeight: 46,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    marginBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  colourPreview: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#201f1f',
    marginRight: 8,
  },

  colourButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },

  adminPreviewCard: {
    minHeight: 70,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminPreviewIconBox: {
    width: 46,
    height: 46,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  adminPreviewIconImage: {
    width: 28,
    height: 28,
  },

  adminIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  adminIconButton: {
    width: '48%',
    minHeight: 54,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminIconButtonActive: {
    borderTopColor: '#9af5a8',
    borderLeftColor: '#9af5a8',
    borderRightColor: '#1d7f2c',
    borderBottomColor: '#1d7f2c',
    backgroundColor: '#d7ffd8',
  },

  adminIconThumb: {
    width: 28,
    height: 28,
    backgroundColor: '#f6f5ed',
    borderWidth: 1,
    borderColor: '#8d8d8d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  adminIconThumbImage: {
    width: 18,
    height: 18,
  },

  adminIconLabel: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },

  topAdminIconBox: {
    width: 42,
    height: 42,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    position: 'relative',
  },

  topAdminIconImage: {
    width: 26,
    height: 26,
  },

  totalUnreadBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#28c840',
    borderWidth: 1,
    borderColor: '#0b7a16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  totalUnreadBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },

  unreadCircle: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    borderWidth: 1,
    borderColor: '#a80000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },

  unreadCircleSecret: {
    backgroundColor: '#9b3ecf',
    borderColor: '#5d1f85',
  },

  unreadCircleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  adminStatusBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#ece9d8',
  borderWidth: 3,
  paddingVertical: 8,
  paddingHorizontal: 12,
  alignSelf: 'flex-start',
},

adminStatusDotBig: {
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#ffffff',
  marginRight: 8,
},

adminStatusAnimWrap: {
  marginRight: 8,
},


adminStatusBadgeText: {
  color: '#000000',
  fontSize: 15,
  fontWeight: '900',
},

keypadWrap: {
  marginBottom: 12,
},

keypadRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},

keypadKey: {
  width: '31%',
  height: 46,
  backgroundColor: '#ece9d8',
  borderWidth: 2,
  borderTopColor: '#ffffff',
  borderLeftColor: '#ffffff',
  borderRightColor: '#777777',
  borderBottomColor: '#777777',
  alignItems: 'center',
  justifyContent: 'center',
},

keypadKeyGhost: {
  width: '31%',
  height: 46,
},

keypadKeyText: {
  color: '#000000',
  fontSize: 18,
  fontWeight: '900',
},

pinDotsRow: {
  flexDirection: 'row',
  justifyContent: 'center',
  marginBottom: 14,
},

pinDot: {
  width: 16,
  height: 16,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#003c9e',
  marginHorizontal: 6,
},

pinDotFilled: {
  backgroundColor: '#003c9e',
},

titleStatusAnimWrap: {
  marginLeft: 8,
},

titleStatusDot: {
  width: 14,
  height: 14,
  borderRadius: 7,
  borderWidth: 1,
  borderColor: '#ffffff',
},

topInfoAdminLabel: {
  color: '#000000',
  fontSize: 15,
  fontWeight: '900',
  marginLeft: 10,
  marginRight: 10,
},

noUnreadText: {
  color: '#666666',
  fontSize: 12,
  fontWeight: '700',
  fontStyle: 'italic',
},


unreadAvatarsRow: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
},

unreadAvatarBox: {
  width: 34,
  height: 34,
  borderRadius: 17,
  borderWidth: 2,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 6,
},

unreadAvatarImage: {
  width: 20,
  height: 20,
},

unreadAvatarBadge: {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 16,
  height: 16,
  borderRadius: 8,
  backgroundColor: '#ff3b30',
  borderWidth: 1,
  borderColor: '#a80000',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 3,
},

unreadAvatarBadgeText: {
  color: '#ffffff',
  fontSize: 9,
  fontWeight: '900',
},

actionHistoryList: {
  marginTop: 8,
  borderTopWidth: 1,
  borderTopColor: '#b9a85c',
  paddingTop: 8,
},

actionHistoryItem: {
  color: '#3a3200',
  fontSize: 11,
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 4,
},

kickButton: {
  width: 38,
  height: 34,
  backgroundColor: '#ece9d8',
  borderWidth: 2,
  borderTopColor: '#4d4d4d',
  borderLeftColor: '#4d4d4d',
  borderRightColor: '#000000',
  borderBottomColor: '#000000',
  alignItems: 'center',
  justifyContent: 'center',
},

kickButtonIcon: {
  width: 20,
  height: 20,
},

});
