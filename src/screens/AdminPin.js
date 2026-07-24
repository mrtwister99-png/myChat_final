// src/screens/AdminPin.js

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

const EYE_ICON = require('../assets/icons/oko.png');
const EYE_SLASH_ICON = require('../assets/icons/okoskrtt.png');
const EYE_SECRET_ICON = require('../assets/icons/okopotaji.png');
const FUCKER_ICON = require('../assets/icons/fuckerr.png');

const DEFAULT_USER_PIN = globalThis.CUSIIK_USER_PIN || '1111';
const DEFAULT_ADMIN_PIN = globalThis.CUSIIK_ADMIN_PIN || '8831';
const DEFAULT_ADMIN_STATUS = globalThis.CUSIIK_ADMIN_STATUS || 'off';

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
  vykricnik: require('../assets/icons/vykricnik.png'),
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

const AdminPin = ({ navigation }) => {
  const [users, setUsers] = useState([
  ]);

  const [nowTick, setNowTick] = useState(Date.now());

  const [currentUserPin, setCurrentUserPin] = useState(DEFAULT_USER_PIN);
  const [currentAdminPin, setCurrentAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [adminStatus, setAdminStatus] = useState(DEFAULT_ADMIN_STATUS);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserName, setNewUserName] = useState('');

  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [changeError, setChangeError] = useState('');
  const [hardResetConfirmStep1Visible, setHardResetConfirmStep1Visible] = useState(false);
  const [hardResetConfirmStep2Visible, setHardResetConfirmStep2Visible] = useState(false);
  const [pendingHardResetPin, setPendingHardResetPin] = useState('');

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsScreen, setSettingsScreen] = useState('menu');
  const [kickPin, setKickPin] = useState('0008');
  const [kickPinError, setKickPinError] = useState('');

  const [newAdminPin, setNewAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [actionUser, setActionUser] = useState(null);
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [colourModalVisible, setColourModalVisible] = useState(false);

  const [readCounts, setReadCounts] = useState(getGlobalReadCounts());
  const [secretMutedUsers, setSecretMutedUsers] = useState(getGlobalSecretMutedUsers());
  const [adminProfile, setAdminProfile] = useState(globalThis.CUSIIK_ADMIN_PROFILE || { icon: 'admin', silhouetteColour: '#0b3d91', bgColour: '#ece9d8' });
  const [adminEditModalVisible, setAdminEditModalVisible] = useState(false);
  const [adminIconModalVisible, setAdminIconModalVisible] = useState(false);
  const [adminOutlineModalVisible, setAdminOutlineModalVisible] = useState(false);
  const [adminBgModalVisible, setAdminBgModalVisible] = useState(false);
  const [lastActionText, setLastActionText] = useState('');
  const [connectionText, setConnectionText] = useState(
    socket.connected ? 'Server online' : 'Připojuji server...'
  );

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
        // pri navratu z pozadi jen refresh tick, ne cely users re-render
        setNowTick(Date.now());
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const handleConnect = () => {
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
      setConnectionText('Server offline - lokální režim');
    };

    const handleConnectError = () => {
      setConnectionText('Server nedostupný - lokální režim');
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
      const isSecretMuted = Boolean(secretMutedUsers[cleanUserId] || secretMutedUsers[String(cleanUserId)]);

      chats[cleanUserId] = safeMessages;

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
      setLastActionText('HARD ROOM RESET přijat ze serveru - lokální data vymazána.');
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('room:hardReset', handleHardReset);

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
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('room:hardReset');
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
      <Text style={isSecretMuted ? styles.muteTagSecretText : styles.muteTagText}>
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

  const closeApp = () => {
    try {
      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      } else {
        BackHandler.exitApp();
      }
    } catch {}
  };

  const closeUserMenu = () => {
    setUserMenuVisible(false);
    setActionUser(null);
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

    setLastActionText(
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

    setLastActionText(`Uživatel byl přejmenován na ${trimmedName}.`);
    closeRenameModal();
  };

  const openChangeModal = () => {
    setNewPin('');
    setChangeError('');
    setChangeModalVisible(true);
  };

  const closeChangeModal = () => {
    setChangeModalVisible(false);
    setNewPin('');
    setChangeError('');
    setPendingHardResetPin('');
    setHardResetConfirmStep1Visible(false);
    setHardResetConfirmStep2Visible(false);
  };

  const saveChangeAndKickUsers = () => {
    const cleanedPin = newPin.replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setChangeError('PIN musí mít přesně 4 číslice.');
      return;
    }

    setPendingHardResetPin(cleanedPin);
    setHardResetConfirmStep1Visible(true);
  };

  const confirmHardResetStep1 = () => {
    setHardResetConfirmStep1Visible(false);
    setHardResetConfirmStep2Visible(true);
  };

  const confirmHardResetFinal = () => {
    const cleanPin = String(pendingHardResetPin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanPin.length !== 4) {
      setHardResetConfirmStep2Visible(false);
      setChangeError('PIN musí mít přesně 4 číslice.');
      return;
    }

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

    setLastActionText(`HARD ROOM RESET proveden. Nový PIN je ${cleanPin}.`);

    setHardResetConfirmStep2Visible(false);
    closeChangeModal();
  };

  const openSettings = () => {
    setSettingsScreen('menu');
    setNewAdminPin('');
    setAdminPinError('');
    setKickPin('0008');
    setKickPinError('');
    setAdminEditModalVisible(false);
    setAdminIconModalVisible(false);
    setAdminOutlineModalVisible(false);
    setSettingsModalVisible(true);
  };

  const closeSettings = () => {
    setSettingsModalVisible(false);
    setSettingsScreen('menu');
    setNewAdminPin('');
    setAdminPinError('');
    setKickPin('0008');
    setKickPinError('');
    setAdminEditModalVisible(false);
    setAdminIconModalVisible(false);
    setAdminOutlineModalVisible(false);
  };

  const openAdminProfileEditor = () => {
    setAdminEditModalVisible(true);
  };

  const closeAdminProfileEditor = () => {
    setAdminEditModalVisible(false);
    setAdminIconModalVisible(false);
    setAdminOutlineModalVisible(false);
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

    setLastActionText(`Admin ikonka byla změněna na ${normalizedIcon}.`);
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

    setLastActionText('Barva obrysu admina byla změněna.');
    setAdminOutlineModalVisible(false);
  };

  const goBackToSettingsMenu = () => {
    setSettingsScreen('menu');
    setNewAdminPin('');
    setAdminPinError('');
    setKickPinError('');
  };

  const chooseUserToKick = (user) => {
    const cleanedPin = String(kickPin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setKickPinError('PIN pro kick musí mít přesně 4 číslice.');
      return;
    }

    kickUserById(user, { newPin: cleanedPin });
    closeSettings();
  };

  const kickUserById = (user, options = {}) => {
    if (!user) {
      return;
    }

    const targetPin = String(options.newPin || '').replace(/[^0-9]/g, '').slice(0, 4);

    if (socket.connected) {
      socket.emit('admin:kickUser', {
        userId: user.id,
        newPin: targetPin || undefined,
      });
    }

    if (targetPin.length === 4) {
      setLastActionText(
        `Uživatel ${user.name} byl kicknut. Jeho speciální PIN je ${targetPin}.`
      );
      return;
    }

    setLastActionText(`Uživatel ${user.name} byl kicknut z roomky.`);
  };

  const saveNewAdminPin = () => {
    const cleanedPin = newAdminPin.replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setAdminPinError('Admin PIN musí mít přesně 4 číslice.');
      return;
    }

    globalThis.CUSIIK_ADMIN_PIN = cleanedPin;

    setCurrentAdminPin(cleanedPin);

    if (socket.connected) {
      socket.emit('admin:setAdminPin', {
        pin: cleanedPin,
      });
    }

    setLastActionText(`Admin PIN byl změněn na ${cleanedPin}.`);

    goBackToSettingsMenu();
  };

  const muteUser = (user, option) => {
    if (!user) {
      return;
    }

    const mutedUsers = { ...getGlobalMutedUsers() };
    const secretMutedUsersMap = { ...getGlobalSecretMutedUsers() };
    const muteUntilTime = Date.now() + option.milliseconds;

    delete secretMutedUsersMap[user.id];
    delete secretMutedUsersMap[String(user.id)];
    globalThis.CUSIIK_SECRET_MUTED_USERS = secretMutedUsersMap;

    mutedUsers[user.id] = muteUntilTime;
    mutedUsers[String(user.id)] = muteUntilTime;
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

    setSecretMutedUsers({ ...secretMutedUsersMap });
    setNowTick(Date.now());

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

    setLastActionText(`Uživatel ${user.name} byl umlčen na ${option.label}.`);
    setMuteModalVisible(false);
    closeUserMenu();
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

    setLastActionText(`Umlčení uživatele ${user.name} bylo zrušeno.`);
    setMuteModalVisible(false);
    closeUserMenu();
  };

  const openMuteModalForUser = (user) => {
    if (!user) {
      return;
    }

    setActionUser(user);
    setMuteModalVisible(true);
    setUserMenuVisible(false);
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
    setNowTick(Date.now());
    setLastActionText(
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

    setLastActionText(`Obrys uživatele ${targetUser.name} byl změněn.`);
    setColourModalVisible(false);
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

    setLastActionText(
      nextEnabled
        ? `Uživatel ${user.name} má uzamčenou ikonku na fuckera.`
        : `Uživatel ${user.name} už nemá uzamčenou ikonku na fuckera.`
    );
  };

  const totalUnreadMessages = users.reduce((sum, user) => {
    return sum + getUnreadCount(user.id);
  }, 0);

  const getUnreadSummaryText = () => {
    if (totalUnreadMessages <= 0) {
      return 'Nemáte nové zprávy';
    }

    if (totalUnreadMessages === 1) {
      return 'Máte 1 novou zprávu';
    }

    if (totalUnreadMessages >= 2 && totalUnreadMessages <= 4) {
      return `Máte ${totalUnreadMessages} nové zprávy`;
    }

    return `Máte ${totalUnreadMessages} nových zpráv`;
  };

  const renderSettingsContent = () => {
    if (settingsScreen === 'kick') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>PIN pro kicknutého uživatele:</Text>

          <TextInput
            value={kickPin}
            onChangeText={(value) => {
              setKickPinError('');
              setKickPin(value.replace(/[^0-9]/g, '').slice(0, 4));
            }}
            style={styles.modalInput}
            placeholder="Např. 0008"
            placeholderTextColor="#666666"
            maxLength={4}
            keyboardType="number-pad"
            inputMode="numeric"
          />

          {kickPinError ? (
            <Text style={styles.errorText}>{kickPinError}</Text>
          ) : null}

          <Text style={styles.modalLabel}>Vyber uživatele ke kicku:</Text>

          {users.length === 0 ? (
            <View style={styles.smallEmptyBox}>
              <Text style={styles.smallEmptyText}>
                V roomce teď není žádný uživatel.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.settingsList}>
              {[...users]
                .sort((a, b) => {
                  if (a.online !== b.online) {
                    return a.online ? -1 : 1;
                  }

                  return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
                })
                .map((user) => (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [
                    styles.settingsUserRow,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => chooseUserToKick(user)}
                >
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
                    {renderUserNameWithMute(user, styles.settingsUserName)}
                    <Text style={styles.settingsUserSubText}>
                      Kliknutím vybereš ke kicku
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'userList') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Vyber uživatele k úpravě:</Text>

          {users.length === 0 ? (
            <View style={styles.smallEmptyBox}>
              <Text style={styles.smallEmptyText}>
                V roomce teď není žádný uživatel.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.settingsList}>
              {[...users]
                .sort((a, b) => {
                  if (a.online !== b.online) {
                    return a.online ? -1 : 1;
                  }
                  return (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
                })
                .map((user) => (
                  <Pressable
                    key={user.id}
                    style={({ pressed }) => [
                      styles.settingsUserRow,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={() => {
                      setSelectedUser(user);
                      setActionUser(user);
                      setSettingsScreen('userEdit');
                    }}
                  >
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
                      {renderUserNameWithMute(user, styles.settingsUserName)}
                      <Text style={styles.settingsUserSubText}>
                        Kliknutím upravíš
                      </Text>
                    </View>
                  </Pressable>
                ))}
            </ScrollView>
          )}

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'userEdit') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Nastavení uživatele:</Text>
          <Text style={styles.selectedUserText}>
            {selectedUser ? selectedUser.name : actionUser ? actionUser.name : ''}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.settingsOption,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={() => {
              if (selectedUser || actionUser) {
                openRenameModal(selectedUser || actionUser);
              }
            }}
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
              setColourModalVisible(true);
            }}
          >
            <Text style={styles.settingsOptionTitle}>Změna obrysu</Text>
            <Text style={styles.settingsOptionText}>
              Změní obrys uživatele, který uvidí admin i uživatel.
            </Text>
          </Pressable>

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={() => setSettingsScreen('userList')}
            >
              <Text style={styles.modalButtonText}>Zpět na výběr</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Menu</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'editProfile') {
      return (
        <View style={styles.modalBody}>
          <View style={styles.adminPreviewCard}>
            <View
              style={[
                styles.adminPreviewIconBox,
                {
                  backgroundColor: adminProfile?.bgColour || '#ece9d8',
                  borderTopColor: adminProfile?.silhouetteColour || '#0b3d91',
                  borderLeftColor: adminProfile?.silhouetteColour || '#0b3d91',
                  borderRightColor: adminProfile?.silhouetteColour || '#0b3d91',
                  borderBottomColor: adminProfile?.silhouetteColour || '#0b3d91',
                },
              ]}
            >
              <Image
                source={getAdminIconSource(adminProfile?.icon || 'admin')}
                style={styles.adminPreviewIconImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.settingsUserTextBox}>
              <Text style={styles.settingsUserName}>
                Ikonka: {normalizeAdminIcon(adminProfile?.icon || 'admin')}
              </Text>
              <Text style={styles.settingsUserSubText}>
                Obrys: {adminProfile?.silhouetteColour || '#0b3d91'}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.settingsOption,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={() => setAdminIconModalVisible(true)}
          >
            <Text style={styles.settingsOptionTitle}>Nastavit ikonku</Text>
            <Text style={styles.settingsOptionText}>
              Ikonka admina se zobrazí uživateli aktivně v chatu.
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.settingsOption,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={() => setAdminOutlineModalVisible(true)}
          >
            <Text style={styles.settingsOptionTitle}>Nastavit barvu obrysu</Text>
            <Text style={styles.settingsOptionText}>
              Barva obrysu admina se zobrazí uživateli aktivně v chatu.
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.settingsOption,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={() => setSettingsScreen('adminPin')}
          >
            <Text style={styles.settingsOptionTitle}>Admin PIN</Text>
            <Text style={styles.settingsOptionText}>
              Nastavíš nový PIN pro vstup do admin panelu.
            </Text>
          </Pressable>

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'adminPin') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Nastavit nový admin PIN:</Text>

          <TextInput
            value={newAdminPin}
            onChangeText={(value) => {
              setAdminPinError('');
              setNewAdminPin(value.replace(/[^0-9]/g, '').slice(0, 4));
            }}
            style={styles.modalInput}
            placeholder="Např. 9876"
            placeholderTextColor="#666666"
            autoFocus
            maxLength={4}
            keyboardType="number-pad"
            inputMode="numeric"
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
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalLabel}>Vyber akci v nastavení:</Text>

        <Pressable
          style={({ pressed }) => [
            styles.statusOption,
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
            <View
              style={[
                styles.statusDot,
                isAdminOnline
                  ? styles.statusDotOn
                  : isAdminJob
                    ? styles.statusDotJob
                    : styles.statusDotOff,
              ]}
            />

            <Text style={styles.statusOptionTitle}>
              Status admina: {getAdminStatusLabel()}
            </Text>
          </View>

          <Text style={styles.statusOptionText}>
            Kliknutím přepneš stav, který uvidí uživatel v chatu.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('kick')}
        >
          <Text style={styles.settingsOptionTitle}>Kick uživatele</Text>
          <Text style={styles.settingsOptionText}>
            Nastavíš PIN pro vybraného uživatele a pak ho kickneš.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('userList')}
        >
          <Text style={styles.settingsOptionTitle}>Nastavení uživatele</Text>
          <Text style={styles.settingsOptionText}>
            Přejmenování a změna obrysu uživatele.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('editProfile')}
        >
          <Text style={styles.settingsOptionTitle}>Nastavení admina</Text>
          <Text style={styles.settingsOptionText}>
            Nastavíš ikonku a barvu obrysu admina.
          </Text>
        </Pressable>

        <View style={styles.modalButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.modalButton,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={closeSettings}
          >
            <Text style={styles.modalButtonText}>Zavřít</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.window}>
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <View style={styles.windowsIcon}>
                <View style={[styles.winSquare, { backgroundColor: '#f35325' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#81bc06' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#05a6f0' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#ffba08' }]} />
              </View>

              <Text style={styles.titleText}>Admin panel</Text>
            </View>

            <View style={styles.windowButtons}>
              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={goToPinEntry}>
                  <Text style={styles.windowButtonText}>←</Text>
                </Pressable>
              </View>

              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={goToPinEntry}>
                  <Text style={styles.windowButtonText}>_</Text>
                </Pressable>
              </View>

              <View style={[styles.windowButton, styles.closeButton]}>
                <Pressable style={styles.closePressable} onPress={closeApp}>
                  <Text style={[styles.windowButtonText, styles.closeButtonText]}>×</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.topInfoPanel}>
              <View style={styles.topInfoLeftColumn}>
                <Text style={styles.topInfoText}>
                  Uživatelský PIN: <Text style={styles.pinText}>{currentUserPin}</Text>
                </Text>

                <View style={styles.adminStatusRow}>
                  <View
                    style={[
                      styles.adminStatusDot,
                      isAdminOnline
                        ? styles.statusDotOn
                        : isAdminJob
                          ? styles.statusDotJob
                          : styles.statusDotOff,
                    ]}
                  />
                  <Text style={styles.topInfoText}>
                    Admin status:{' '}
                    <Text style={styles.pinText}>{getAdminStatusLabel()}</Text>
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.topAdminIconBox,
                  {
                    backgroundColor: adminProfile?.bgColour || '#ece9d8',
                    borderTopColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderLeftColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderRightColor: adminProfile?.silhouetteColour || '#0b3d91',
                    borderBottomColor: adminProfile?.silhouetteColour || '#0b3d91',
                  },
                ]}
              >
                <Image
                  source={getAdminIconSource(adminProfile?.icon || 'admin')}
                  style={styles.topAdminIconImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.usersPanel}>
              <View style={styles.panelTitleBar}>
                <Text style={styles.panelTitleText}>Uživatelé v roomce</Text>
                <Text style={styles.panelCountText}>
                  {users.filter((user) => user.online).length} online
                </Text>
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

                    return (
                      <View
                        key={user.id}
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
                            pressed && styles.userInfoPressed,
                          ]}
                          onPress={() => openAdminChat(user)}
                        >
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

                          <View style={styles.userTextBox}>
                            <View style={styles.userNameRow}>
                              {renderUserNameWithMute(user, styles.userName)}
                              <UnreadBadge count={unreadCount} isSecret={isUserSecretMuted} />
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

                          {renderMuteTag(user)}
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.eyeToggleButton,
                            pressed && styles.xpButtonPressed,
                            isUserSecretMuted && styles.eyeToggleButtonActive,
                            !isUserSecretMuted && isUserMuted && styles.eyeToggleButtonMuted,
                          ]}
                          onPress={() => toggleSecretMute(user)}
                          onLongPress={() => openMuteModalForUser(user)}
                          delayLongPress={260}
                        >
                          <Image
                            source={isUserSecretMuted ? EYE_SECRET_ICON : (isUserMuted ? EYE_SLASH_ICON : EYE_ICON)}
                            style={styles.eyeToggleIcon}
                            resizeMode="contain"
                          />
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.fuckerButton,
                            isUserFuckerLocked && styles.fuckerButtonActive,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => setUserToFuckerAvatar(user)}
                        >
                          <Image
                            source={FUCKER_ICON}
                            style={styles.fuckerButtonIcon}
                            resizeMode="contain"
                          />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>

            {lastActionText ? (
              <View style={styles.actionBox}>
                <Text style={styles.actionText}>{lastActionText}</Text>
              </View>
            ) : null}

            <View style={styles.bottomButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.bottomButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openChangeModal}
              >
                <Text style={styles.bottomButtonText}>HARD ROOM RESET</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.bottomButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openSettings}
              >
                <Text style={styles.bottomButtonText}>Nastavení</Text>
              </Pressable>


            </View>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Připojeno jako admin</Text>
            <Text style={styles.statusText}>{connectionText}</Text>
          </View>
        </View>

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
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
                    setColourModalVisible(true);
                    setUserMenuVisible(false);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>Změna obrysu</Text>
                  <Text style={styles.settingsOptionText}>
                    Změní obrys uživatele, který uvidí admin i uživatel.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    kickUserById(actionUser, { newPin: '0008' });
                    closeUserMenu();
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>Kick</Text>
                  <Text style={styles.settingsOptionText}>
                    Vyhodí uživatele z roomky a nastaví PIN 0008.
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
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Umlčet uživatele</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setMuteModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
                <Text style={styles.modalTitleText}>Upravit profil admina</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeAdminProfileEditor}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.adminPreviewCard}>
                  <View
                    style={[
                      styles.adminPreviewIconBox,
                      {
                        backgroundColor: adminProfile?.bgColour || '#ece9d8',
                        borderTopColor: adminProfile?.silhouetteColour || '#0b3d91',
                        borderLeftColor: adminProfile?.silhouetteColour || '#0b3d91',
                        borderRightColor: adminProfile?.silhouetteColour || '#0b3d91',
                        borderBottomColor: adminProfile?.silhouetteColour || '#0b3d91',
                      },
                    ]}
                  >
                    <Image
                      source={getAdminIconSource(adminProfile?.icon || 'admin')}
                      style={styles.adminPreviewIconImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.settingsUserTextBox}>
                    <Text style={styles.settingsUserName}>Aktuální ikonka: {normalizeAdminIcon(adminProfile?.icon || 'admin')}</Text>
                    <Text style={styles.settingsUserSubText}>Obrys: {adminProfile?.silhouetteColour || '#0b3d91'}</Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => setAdminIconModalVisible(true)}
                >
                  <Text style={styles.settingsOptionTitle}>Vybrat ikonku</Text>
                  <Text style={styles.settingsOptionText}>
                    Možnosti: admin, admin1, admin2, admin3, admin4, admin5.
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => setAdminOutlineModalVisible(true)}
                >
                  <Text style={styles.settingsOptionTitle}>Vybrat barvu obrysu</Text>
                  <Text style={styles.settingsOptionText}>
                    20 barev (o 10 více než uživatel).
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
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
                          <Image
                            source={getAdminIconSource(iconOption.key)}
                            style={styles.adminIconThumbImage}
                            resizeMode="contain"
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
                  <Text style={styles.modalCloseButtonText}>×</Text>
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
          visible={changeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeChangeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalWindow, styles.modalWindowDangerDouble]}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>HARD ROOM RESET</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeChangeModal}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Nový 4místný PIN pro uživatele:</Text>

                <TextInput
                  value={newPin}
                  onChangeText={(value) => {
                    setChangeError('');
                    setNewPin(value.replace(/[^0-9]/g, '').slice(0, 4));
                  }}
                  style={styles.modalInput}
                  placeholder="Např. 4582"
                  placeholderTextColor="#666666"
                  autoFocus
                  maxLength={4}
                  keyboardType="number-pad"
                  inputMode="numeric"
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
            </View>
          </View>
        </Modal>

        <Modal
          visible={hardResetConfirmStep1Visible}
          transparent
          animationType="fade"
          onRequestClose={() => setHardResetConfirmStep1Visible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalWindow, styles.modalWindowDangerSingle]}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>HARD ROOM RESET - potvrzení 1/2</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setHardResetConfirmStep1Visible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

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
                    onPress={() => setHardResetConfirmStep1Visible(false)}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={hardResetConfirmStep2Visible}
          transparent
          animationType="fade"
          onRequestClose={() => setHardResetConfirmStep2Visible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalWindow, styles.modalWindowDangerSingle]}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>HARD ROOM RESET - finální potvrzení</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setHardResetConfirmStep2Visible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

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
                    onPress={() => setHardResetConfirmStep2Visible(false)}
                  >
                    <Text style={styles.modalButtonText}>NE</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeSettings}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Nastavení</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeSettings}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              {renderSettingsContent()}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
  },

  titleBar: {
    height: 38,
    backgroundColor: '#0058d8',
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

  windowsIcon: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 7,
  },

  winSquare: {
    width: 8,
    height: 8,
    margin: 0.5,
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
    backgroundColor: '#d7e8ff',
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#174a9c',
    borderBottomColor: '#174a9c',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButton: {
    backgroundColor: '#e04b31',
  },

  windowButtonText: {
    color: '#003c8f',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },

  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 19,
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
    color: '#003c9e',
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
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
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
    marginRight: 10,
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
    borderTopColor: '#e49b38',
    borderLeftColor: '#e49b38',
    borderRightColor: '#8b4700',
    borderBottomColor: '#8b4700',
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

  bottomButtons: {
    paddingTop: 10,
    flexDirection: 'row',
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
  },

  modalWindowDangerSingle: {
    borderTopColor: '#ff8a8a',
    borderLeftColor: '#ff8a8a',
    borderRightColor: '#a80000',
    borderBottomColor: '#a80000',
  },

  modalWindowDangerDouble: {
    borderWidth: 4,
    borderTopColor: '#ff8a8a',
    borderLeftColor: '#ff8a8a',
    borderRightColor: '#a80000',
    borderBottomColor: '#a80000',
    shadowColor: '#a80000',
    shadowOpacity: 0.35,
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
    backgroundColor: '#e04b31',
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#8f1d10',
    borderBottomColor: '#8f1d10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 19,
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
    borderColor: '#28c840',
  },

  statusOptionJob: {
    borderColor: '#f5a623',
  },

  statusOptionOff: {
    borderColor: '#ff3b30',
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
    borderTopColor: '#e49b38',
    borderLeftColor: '#e49b38',
    borderRightColor: '#8b4700',
    borderBottomColor: '#8b4700',
  },

  settingsOptionSecretMute: {
    borderTopColor: '#b67ae8',
    borderLeftColor: '#b67ae8',
    borderRightColor: '#5d1f85',
    borderBottomColor: '#5d1f85',
  },

  userRowMuted: {
    borderTopColor: '#c46a00',
    borderLeftColor: '#c46a00',
    borderRightColor: '#8b4700',
    borderBottomColor: '#8b4700',
  },

  userRowSecretMuted: {
    borderTopColor: '#9c4dcc',
    borderLeftColor: '#9c4dcc',
    borderRightColor: '#5d1f85',
    borderBottomColor: '#5d1f85',
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
  },

  topAdminIconImage: {
    width: 26,
    height: 26,
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
});
