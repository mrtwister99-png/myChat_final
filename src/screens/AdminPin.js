// src/screens/AdminPin.js

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
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
const FUCKER_ICON = require('../assets/icons/fuckerr.png');

const DEFAULT_USER_PIN = globalThis.CUSIIK_USER_PIN || '1111';
const DEFAULT_ADMIN_PIN = globalThis.CUSIIK_ADMIN_PIN || '8831';
const DEFAULT_ADMIN_STATUS = globalThis.CUSIIK_ADMIN_STATUS || 'off';

const MUTE_OPTIONS = [
  { label: '10 min', milliseconds: 10 * 60 * 1000 },
  { label: '30 min', milliseconds: 30 * 60 * 1000 },
  { label: '1 hod', milliseconds: 60 * 60 * 1000 },
  { label: '5 hod', milliseconds: 5 * 60 * 60 * 1000 },
  { label: '12 hod', milliseconds: 12 * 60 * 60 * 1000 },
  { label: '1 den', milliseconds: 24 * 60 * 60 * 1000 },
  { label: '2 dny', milliseconds: 2 * 24 * 60 * 60 * 1000 },
  { label: '7 dní', milliseconds: 7 * 24 * 60 * 60 * 1000 },
];

const USER_COLOURS = [
  { label: 'Zelená', value: '#35c759' },
  { label: 'Červená', value: '#ff3b30' },
  { label: 'Žlutá', value: '#ffcc00' },
  { label: 'Oranžová', value: '#ff9500' },
  { label: 'Fialová', value: '#af52de' },
  { label: 'Černá', value: '#111111' },
  { label: 'Hnědá', value: '#8b5a2b' },
  { label: 'Tyrkysová', value: '#40e0d0' },
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

  return messages.filter((message) => message.sender === 'user').length;
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

    if (
      current.id !== next.id ||
      current.name !== next.name ||
      current.online !== next.online ||
      current.lastSeenAt !== next.lastSeenAt ||
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
    const handleConnect = () => {
      setConnectionText('Server online');
      socket.emit('state:get');
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
        globalThis.CUSIIK_SECRET_MUTED_USERS = serverState.secretMutedUsers;
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
      }

    };

    const handleChatMessages = ({ userId, messages }) => {
      const chats = getGlobalChats();
      const safeMessages = messages || [];

      chats[userId] = safeMessages;

      const nextReadCounts = { ...getGlobalReadCounts() };
      setReadCounts((currentReadCounts) => {
        if (areReadCountsEqual(currentReadCounts, nextReadCounts)) {
          return currentReadCounts;
        }

        return nextReadCounts;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);

    if (!socket.connected) {
      socket.connect();
    } else {
      socket.emit('state:get');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
    };
  }, []);

  const renderUserNameWithMute = (user, textStyle) => {
    const muteText = formatMuteLeft(user.id, nowTick);
    const secretMutedUsers = getGlobalSecretMutedUsers();
    const isSecretMuted = Boolean(secretMutedUsers[user.id]);

    return (
      <Text style={textStyle}>
        {user.name}
        {muteText ? <Text style={styles.mutedMinutesText}> ({muteText})</Text> : null}
        {isSecretMuted ? <Text style={styles.secretMutedText}> (potají)</Text> : null}
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
    const nextReadCounts = {
      ...getGlobalReadCounts(),
      [userId]: getUserMessageCount(userId),
    };

    globalThis.CUSIIK_ADMIN_READ_COUNTS = nextReadCounts;
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
    navigation.replace('PinEntry');
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
    setSelectedUser(null);
    setNewUserName('');
  };

  const saveRename = () => {
    const trimmedName = newUserName.trim();

    if (!selectedUser || !trimmedName) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              name: trimmedName,
            }
          : user
      )
    );

    if (socket.connected) {
      socket.emit('admin:renameUser', {
        userId: selectedUser.id,
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
  };

  const saveChangeAndKickUsers = () => {
    const cleanedPin = newPin.replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setChangeError('PIN musí mít přesně 4 číslice.');
      return;
    }

    Alert.alert(
      'HARD ROOM RESET',
      'Po potvrzení se nastaví nový PIN pro všechny uživatele, všichni uživatelé budou kicknuti z roomky a smazáni!\n\nOpravdu chceš toto udělat?\nInformoval jsi všechny důležité o novém PINu?',
      [
        {
          text: 'NE',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => {
            Alert.alert(
              'Poslední potvrzení',
              'Tento krok je nevratný... Opravdu potvrdit?',
              [
                {
                  text: 'NE',
                  style: 'cancel',
                },
                {
                  text: 'ANO',
                  style: 'destructive',
                  onPress: () => {
                    globalThis.CUSIIK_USER_PIN = cleanedPin;
                    setCurrentUserPin(cleanedPin);

                    if (socket.connected) {
                      socket.emit('admin:setUserPin', {
                        pin: cleanedPin,
                      });
                    }

                    setLastActionText(
                      `HARD ROOM RESET proveden. Nový PIN je ${cleanedPin}.`
                    );

                    closeChangeModal();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openSettings = () => {
    setSettingsScreen('menu');
    setNewAdminPin('');
    setAdminPinError('');
    setKickPin('0008');
    setKickPinError('');
    setSettingsModalVisible(true);
  };

  const closeSettings = () => {
    setSettingsModalVisible(false);
    setSettingsScreen('menu');
    setNewAdminPin('');
    setAdminPinError('');
    setKickPin('0008');
    setKickPinError('');
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

    const mutedUsers = getGlobalMutedUsers();
    const muteUntilTime = Date.now() + option.milliseconds;

    mutedUsers[user.id] = muteUntilTime;
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

    if (socket.connected) {
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

    setNowTick(Date.now());
    setLastActionText(`Uživatel ${user.name} byl umlčen na ${option.label}.`);
    setMuteModalVisible(false);
    closeUserMenu();
  };

  const unmuteUser = (user) => {
    if (!user) {
      return;
    }

    const mutedUsers = getGlobalMutedUsers();
    delete mutedUsers[user.id];
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

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

    setNowTick(Date.now());
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

    const secretMutedUsers = getGlobalSecretMutedUsers();
    const nextValue = !secretMutedUsers[user.id];
    const mutedUsers = getGlobalMutedUsers();

    secretMutedUsers[user.id] = nextValue;
    globalThis.CUSIIK_SECRET_MUTED_USERS = secretMutedUsers;

    if (nextValue) {
      delete mutedUsers[user.id];
      globalThis.CUSIIK_MUTED_USERS = mutedUsers;
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

    setNowTick(Date.now());
    setLastActionText(
      nextValue
        ? `Uživatel ${user.name} byl umlčen potají.`
        : `Tajné umlčení uživatele ${user.name} bylo zrušeno.`
    );

    closeUserMenu();
  };

  const changeUserColour = (user, colour) => {
    if (!user) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === user.id
          ? {
              ...currentUser,
              silhouetteColour: colour,
            }
          : currentUser
      )
    );

    if (socket.connected) {
      socket.emit('admin:setUserColour', {
        userId: user.id,
        colour,
      });
    }

    setLastActionText(`Obrys uživatele ${user.name} byl změněn.`);
    setColourModalVisible(false);
    closeUserMenu();
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
                <Text style={styles.windowButtonText}>_</Text>
              </View>

              <View style={styles.windowButton}>
                <Text style={styles.windowButtonText}>□</Text>
              </View>

              <View style={[styles.windowButton, styles.closeButton]}>
                <Pressable style={styles.closePressable} onPress={goToPinEntry}>
                  <Text style={[styles.windowButtonText, styles.closeButtonText]}>×</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.topInfoPanel}>
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
                    const secretMutedUsers = getGlobalSecretMutedUsers();
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

                              {unreadCount > 0 ? (
                                <View style={styles.unreadBadge}>
                                  <Text style={styles.unreadBadgeText}>
                                    {unreadCount}{' '}
                                    {unreadCount === 1 ? 'nová zpráva' : 'nových zpráv'}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            <Text
                              style={[
                                styles.userStatus,
                                user.online ? styles.userStatusOnline : null,
                              ]}
                            >
                              {formatLastSeen(user, nowTick)}
                            </Text>
                          </View>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.eyeToggleButton,
                            isUserSecretMuted && styles.eyeToggleButtonActive,
                            !isUserSecretMuted && isUserMuted && styles.eyeToggleButtonMuted,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => toggleSecretMute(user)}
                          onLongPress={() => openMuteModalForUser(user)}
                          delayLongPress={260}
                        >
                          <Image
                            source={isUserSecretMuted ? EYE_SLASH_ICON : EYE_ICON}
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

                        <Pressable
                          style={({ pressed }) => [
                            styles.gearButton,
                            pressed && styles.xpButtonPressed,
                          ]}
                          onPress={() => openUserMenu(user)}
                        >
                          <Text style={styles.gearButtonText}>⚙</Text>
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

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionMute,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => {
                    if (isUserMutedNow(actionUser?.id, nowTick)) {
                      unmuteUser(actionUser);
                      return;
                    }

                    openMuteModalForUser(actionUser);
                  }}
                >
                  <Text style={styles.settingsOptionTitle}>
                    {isUserMutedNow(actionUser?.id, nowTick) ? 'Zrušit mlčení' : 'Umlčet'}
                  </Text>
                  <Text style={styles.settingsOptionText}>
                    {isUserMutedNow(actionUser?.id, nowTick)
                      ? 'Okamžitě zruší aktivní umlčení uživatele.'
                      : 'Uživatel nebude moct psát po zvolenou dobu.'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.settingsOption,
                    styles.settingsOptionSecretMute,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => toggleSecretMute(actionUser)}
                >
                  <Text style={styles.settingsOptionTitle}>Umlčet potají</Text>
                  <Text style={styles.settingsOptionText}>
                    Uživatel uvidí admin status OFF, i když bude pro ostatní ON.
                  </Text>
                </Pressable>
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
                  {actionUser ? actionUser.name : ''}
                </Text>

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
          visible={changeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeChangeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
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
    backgroundColor: '#0058d8',
  },

  page: {
    flex: 1,
    backgroundColor: '#1f7a7a',
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
    color: '#d00000',
    fontSize: 15,
    fontWeight: '900',
  },

  secretMutedText: {
    color: '#7a00cc',
    fontSize: 12,
    fontWeight: '900',
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
    borderColor: '#7a00cc',
  },

  eyeToggleButtonMuted: {
    borderColor: '#c46a00',
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
});