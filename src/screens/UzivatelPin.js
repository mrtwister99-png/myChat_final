// src/screens/UzivatelPin.js

import React, { useEffect, useRef, useState } from 'react';
import {
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { socket } from '../socket';
import {
  showLocalMessageNotification,
} from '../notifications';

const resolveCurrentUserId = (routeUserId) => {
  const cleanRouteUserId = String(routeUserId || '').trim();

  if (cleanRouteUserId) {
    return cleanRouteUserId;
  }

  const globalUserId = globalThis.CUSIIK_CURRENT_USER_ID;
  const cleanGlobalUserId = String(globalUserId || '').trim();

  return cleanGlobalUserId || '1';
};

const LOCAL_RANDOM_USER_NAMES = [
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

const getRandomLocalUserName = () => {
  return LOCAL_RANDOM_USER_NAMES[Math.floor(Math.random() * LOCAL_RANDOM_USER_NAMES.length)] || 'Uživatel';
};

const isPlaceholderUserName = (name) => {
  const normalized = String(name || '').trim().toLowerCase();

  return (
    !normalized ||
    normalized === 'uzivatel' ||
    normalized === 'uživatel' ||
    /^uzivatel\s*\d+$/.test(normalized) ||
    /^uživatel\s*\d+$/.test(normalized)
  );
};

const getCurrentUserName = () => {
  const storedName = globalThis.CUSIIK_CURRENT_USER_NAME;

  if (!isPlaceholderUserName(storedName)) {
    return storedName;
  }

  return getRandomLocalUserName();
};

const HELPER_MESSAGES = [
  'Server laguje, můžeš zkusit zvýšit rate na 0,5?',
  'Mám teď 1200 ms, dá se s tím něco dělat?',
  'Můžeš mě teleportovat na souřadnice [2,0]?',
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

const USER_ICON_OPTIONS = [
  { key: 'cat', label: 'kočka' },
  { key: 'pes', label: 'pes' },
  { key: 'devil', label: 'devil' },
  { key: 'klaun', label: 'klaun' },
  { key: 'happy', label: 'prsa' },
  { key: 'stop', label: 'stop' },
  { key: 'vykricnik', label: 'výstraha' },
];

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

const getIconSource = (iconKey) => {
  return USER_ICON_SOURCES[normalizeAvatarIcon(iconKey)] || USER_ICON_SOURCES.uzivatel;
};

const getAdminStatus = () => {
  return globalThis.CUSIIK_ADMIN_STATUS || 'off';
};

const getGlobalChats = () => {
  if (!globalThis.CUSIIK_CHATS) {
    globalThis.CUSIIK_CHATS = {};
  }

  return globalThis.CUSIIK_CHATS;
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

const getGlobalUserReadCounts = () => {
  if (!globalThis.CUSIIK_USER_READ_COUNTS) {
    globalThis.CUSIIK_USER_READ_COUNTS = {};
  }

  return globalThis.CUSIIK_USER_READ_COUNTS;
};

const formatMuteTimeLeft = (muteUntil) => {
  const now = Date.now();
  const diff = muteUntil - now;

  if (diff <= 0) {
    return '0 min';
  }

  const totalMinutes = Math.ceil(diff / 1000 / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const totalHours = Math.ceil(totalMinutes / 60);

  if (totalHours < 24) {
    return `${totalHours} hod`;
  }

  const totalDays = Math.ceil(totalHours / 24);
  return `${totalDays} dní`;
};

const formatMessageTime = (timestamp) => {
  const date = timestamp ? new Date(timestamp) : new Date();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const getInitialMessages = (userId) => {
  const chats = getGlobalChats();

  if (!chats[userId]) {
    chats[userId] = [
      {
        id: 1,
        sender: 'admin',
        text: 'Ahoj, tady admin. Napiš mi zprávu.',
        createdAt: Date.now(),
      },
    ];
  }

  return chats[userId];
};

const getAdminMessageCount = (messages) => {
  return messages.filter((item) => item.sender === 'admin').length;
};

const UzivatelPin = ({ navigation, route }) => {
  const scrollViewRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const screenMountAtRef = useRef(Date.now());
  const screenModeRef = useRef('menu');
  const currentUserId = resolveCurrentUserId(route?.params?.userId);
  const [currentUserName, setCurrentUserName] = useState(getCurrentUserName());
  const [screenMode, setScreenMode] = useState('menu');
  const [iconModalVisible, setIconModalVisible] = useState(false);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(getInitialMessages);
  const [adminStatus, setAdminStatus] = useState(getAdminStatus());
  const [nowTick, setNowTick] = useState(Date.now());
  const [blockedInfo, setBlockedInfo] = useState('');
  const [helperMessageIndex, setHelperMessageIndex] = useState(0);
  const [serverMutedUsers, setServerMutedUsers] = useState(getGlobalMutedUsers());

  const [userIconColour, setUserIconColour] = useState(
    globalThis.CUSIIK_USER_ICON_COLOUR || '#0b3d91'
  );
  const [userBgColour, setUserBgColour] = useState(
    globalThis.CUSIIK_USER_BG_COLOUR || '#f5f5f5'
  );
  const [userAvatarIcon, setUserAvatarIcon] = useState(
    normalizeAvatarIcon(globalThis.CUSIIK_USER_AVATAR_ICON || 'uzivatel')
  );
  const [isAvatarLocked, setIsAvatarLocked] = useState(
    Boolean(globalThis.CUSIIK_USER_AVATAR_LOCKED)
  );

  const [readAdminCount, setReadAdminCount] = useState(
    getGlobalUserReadCounts()[currentUserId] || 0
  );

  useEffect(() => {
    globalThis.CUSIIK_CURRENT_USER_ID = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    screenModeRef.current = screenMode;
    if (screenMode === 'chat') {
      globalThis.CUSIIK_ACTIVE_USER_CHAT_ID = String(currentUserId);
    } else if (String(globalThis.CUSIIK_ACTIVE_USER_CHAT_ID || '') === String(currentUserId)) {
      globalThis.CUSIIK_ACTIVE_USER_CHAT_ID = null;
    }
  }, [screenMode]);

  const secretMutedUsers = getGlobalSecretMutedUsers();
  const isSecretMuted = Boolean(secretMutedUsers[currentUserId]);

  const effectiveAdminStatus = isSecretMuted ? 'off' : adminStatus;
  const isAdminOnline = effectiveAdminStatus === 'on';
  const isAdminJob = effectiveAdminStatus === 'job';

  const getAdminStatusLabel = () => {
    if (effectiveAdminStatus === 'on') {
      return 'on';
    }

    if (effectiveAdminStatus === 'job') {
      return 'job';
    }

    return 'off';
  };

  const getAdminStatusText = () => {
    if (effectiveAdminStatus === 'on') {
      return 'online';
    }

    if (effectiveAdminStatus === 'job') {
      return 'JOB';
    }

    return 'offline';
  };
  const currentHelperMessage = HELPER_MESSAGES[helperMessageIndex];

  const adminMessageCount = getAdminMessageCount(messages);
  const unreadCount = Math.max(adminMessageCount - readAdminCount, 0);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 120);
  };

  const markMessagesAsRead = (nextMessages = messages) => {
    const nextReadCounts = {
      ...getGlobalUserReadCounts(),
      [currentUserId]: getAdminMessageCount(nextMessages),
    };

    globalThis.CUSIIK_USER_READ_COUNTS = nextReadCounts;
    setReadAdminCount(nextReadCounts[currentUserId] || 0);
  };

  const openChat = () => {
    setScreenMode('chat');
    markMessagesAsRead(messages);
    scrollToBottom(false);
  };

  const getMuteUntil = () => {
    const mutedUsers = getGlobalMutedUsers();

    return serverMutedUsers[currentUserId] || mutedUsers[currentUserId] || 0;
  };

  const muteUntil = getMuteUntil();
  const isMuted = muteUntil > nowTick;
  const muteTimeLeft = isMuted ? formatMuteTimeLeft(muteUntil) : '';

  const refreshScreenData = () => {
    const chats = getGlobalChats();

    setNowTick(Date.now());

    if (!socket.connected) {
      setAdminStatus(getAdminStatus());
      setMessages(chats[currentUserId] || getInitialMessages());
    }
  };

  useEffect(() => {
    refreshScreenData();

    const interval = setInterval(() => {
      refreshScreenData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleServerState = (serverState) => {
      if (serverState?.adminStatus) {
        setAdminStatus(serverState.adminStatus);
        globalThis.CUSIIK_ADMIN_STATUS = serverState.adminStatus;
      }

      if (Array.isArray(serverState?.users)) {
        const currentUser = serverState.users.find(
          (user) => String(user.id) === String(currentUserId)
        );

        if (currentUser?.name) {
          setCurrentUserName(currentUser.name);
          globalThis.CUSIIK_CURRENT_USER_NAME = currentUser.name;
        }

        const nextSilhouette = currentUser?.silhouetteColour || currentUser?.colour;
        if (nextSilhouette) {
          setUserIconColour(nextSilhouette);
          globalThis.CUSIIK_USER_ICON_COLOUR = nextSilhouette;
        }

        if (currentUser?.bgColour) {
          setUserBgColour(currentUser.bgColour);
          globalThis.CUSIIK_USER_BG_COLOUR = currentUser.bgColour;
        }

        if (currentUser?.avatarIcon) {
          const normalizedIcon = normalizeAvatarIcon(currentUser.avatarIcon);
          setUserAvatarIcon(normalizedIcon);
          globalThis.CUSIIK_USER_AVATAR_ICON = normalizedIcon;
        }

        const nextAvatarLocked = Boolean(currentUser?.avatarLocked);
        setIsAvatarLocked(nextAvatarLocked);
        globalThis.CUSIIK_USER_AVATAR_LOCKED = nextAvatarLocked;
      }

      if (serverState?.mutedUsers) {
        setServerMutedUsers(serverState.mutedUsers);
        globalThis.CUSIIK_MUTED_USERS = serverState.mutedUsers;
      }

      if (serverState?.secretMutedUsers) {
        globalThis.CUSIIK_SECRET_MUTED_USERS = serverState.secretMutedUsers;
      }

      setNowTick(Date.now());
    };

    const handleChatMessages = ({ userId, messages: nextMessages }) => {
      if (userId !== currentUserId) {
        return;
      }

      const chats = getGlobalChats();
      const previousMessages = chats[currentUserId] || [];
      const safeMessages = nextMessages || [];
      const previousAdminMessages = previousMessages.filter(
        (item) => item.sender === 'admin'
      ).length;
      const nextAdminMessages = safeMessages.filter(
        (item) => item.sender === 'admin'
      ).length;

      chats[currentUserId] = safeMessages;
      setMessages(safeMessages);

      const currentReadCount = getGlobalUserReadCounts()[currentUserId] || 0;
      const previousUnread = Math.max(previousAdminMessages - currentReadCount, 0);
      const nextUnread = Math.max(nextAdminMessages - currentReadCount, 0);
      const activeChatUserId = String(globalThis.CUSIIK_ACTIVE_USER_CHAT_ID || '').trim();
      const isActiveInThisChat = activeChatUserId === String(currentUserId);
      const newestAdminMessage = [...safeMessages]
        .reverse()
        .find((item) => item?.sender === 'admin');
      const newestAdminAt = Number(newestAdminMessage?.createdAt || 0);
      const looksLikeHistoricalSync = newestAdminAt > 0 && newestAdminAt < screenMountAtRef.current;
      const isInitialSync = !initialSyncDoneRef.current;

      if (isInitialSync) {
        initialSyncDoneRef.current = true;

        // First sync can contain old server history; do not notify for that backlog.
        if (looksLikeHistoricalSync) {
          if (screenModeRef.current === 'chat') {
            markMessagesAsRead(safeMessages);
          }

          return;
        }
      }

      const shouldNotify =
        !isActiveInThisChat &&
        screenModeRef.current !== 'chat' &&
        nextUnread > previousUnread;

      if (shouldNotify) {
        showLocalMessageNotification({
          title: 'Nová zpráva od admina',
          body: 'Máš novou zprávu v chatu.',
        });
      }

      if (screenModeRef.current === 'chat') {
        markMessagesAsRead(safeMessages);
      }
    };

    const handleMuted = ({ userId, muteUntil: nextMuteUntil }) => {
      if (userId !== currentUserId) {
        return;
      }

      setBlockedInfo(
        `Nemůžeš psát. Jsi umlčený ještě na ${formatMuteTimeLeft(nextMuteUntil)}.`
      );
      setNowTick(Date.now());
    };

    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('chat:muted', handleMuted);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('state:get');
    socket.emit('chat:get', {
      userId: currentUserId,
    });

    return () => {
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('chat:muted', handleMuted);
    };
  }, [currentUserId]);

  useEffect(() => {
    const helperInterval = setInterval(() => {
      setHelperMessageIndex((currentIndex) => {
        return (currentIndex + 1) % HELPER_MESSAGES.length;
      });
    }, 7500);

    return () => clearInterval(helperInterval);
  }, []);

  useEffect(() => {
    if (!navigation?.addListener) {
      return undefined;
    }

    const unsubscribe = navigation.addListener('focus', () => {
      refreshScreenData();

      if (socket.connected) {
        socket.emit('state:get');
        socket.emit('chat:get', {
          userId: currentUserId,
        });
      }

      if (screenMode === 'chat') {
        markMessagesAsRead(messages);
      }
    });

    return unsubscribe;
  }, [navigation, screenMode, messages]);

  useEffect(() => {
    return () => {
      if (String(globalThis.CUSIIK_ACTIVE_USER_CHAT_ID || '') === String(currentUserId)) {
        globalThis.CUSIIK_ACTIVE_USER_CHAT_ID = null;
      }
    };
  }, [currentUserId]);

  useEffect(() => {
    if (screenMode === 'chat') {
      scrollToBottom(true);
    }
  }, [messages.length, screenMode]);

  const goToLogin = async () => {
    setBlockedInfo('');
    Keyboard.dismiss();

    if (socket.connected) {
      socket.emit('auth:pauseUser');
    }

    globalThis.CUSIIK_CURRENT_USER_ID = null;
    globalThis.CUSIIK_CURRENT_ROLE = null;

    setTimeout(() => {
      navigation.replace('PinEntry');
    }, 80);
  };

  const saveMessages = (nextMessages) => {
    const chats = getGlobalChats();

    chats[currentUserId] = nextMessages;
    setMessages(nextMessages);
  };

  const useHelperMessage = () => {
    if (isMuted) {
      setBlockedInfo(`Nemůžeš psát. Jsi umlčený ještě na ${muteTimeLeft}.`);
      return;
    }

    setBlockedInfo('');
    setMessage(currentHelperMessage);
  };

  const changeUserAvatarIcon = (iconKey) => {
    if (isAvatarLocked) {
      setBlockedInfo('Ikonka je uzamčená adminem a nelze ji změnit.');
      setIconModalVisible(false);
      return;
    }

    const normalizedIcon = normalizeAvatarIcon(iconKey);

    setUserAvatarIcon(normalizedIcon);
    globalThis.CUSIIK_USER_AVATAR_ICON = normalizedIcon;

    if (socket.connected) {
      socket.emit('user:setAvatarIcon', {
        userId: currentUserId,
        icon: normalizedIcon,
      });
    }

    setIconModalVisible(false);
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (isMuted) {
      setBlockedInfo(`Nemůžeš psát. Jsi umlčený ještě na ${muteTimeLeft}.`);
      return;
    }

    if (!trimmedMessage) {
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmedMessage,
      createdAt: Date.now(),
    };

    if (socket.connected) {
      socket.emit('chat:send', {
        userId: currentUserId,
        sender: 'user',
        text: trimmedMessage,
      });

      setMessage('');
      setBlockedInfo('');
      return;
    }

    const nextMessages = [...messages, newMessage];

    saveMessages(nextMessages);
    setMessage('');
    setBlockedInfo('');
  };

  const renderTitleBar = (title) => {
    return (
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.windowsIcon}>
            <View style={[styles.winSquare, { backgroundColor: '#f35325' }]} />
            <View style={[styles.winSquare, { backgroundColor: '#81bc06' }]} />
            <View style={[styles.winSquare, { backgroundColor: '#05a6f0' }]} />
            <View style={[styles.winSquare, { backgroundColor: '#ffba08' }]} />
          </View>

          <Text style={styles.titleText}>{title}</Text>

          <View
            style={[
              styles.titleStatusDot,
              isAdminOnline
                ? styles.statusOnline
                : isAdminJob
                  ? styles.statusJob
                  : styles.statusOffline,
            ]}
          />

          <Text style={styles.titleStatusText}>
            {getAdminStatusLabel()}
          </Text>
        </View>

        <View style={styles.windowButtons}>
          {screenMode === 'chat' ? (
            <View style={styles.windowButton}>
              <Pressable
                style={styles.closePressable}
                onPress={() => setScreenMode('menu')}
              >
                <Text style={styles.windowButtonText}>←</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.windowButton}>
            <Text style={styles.windowButtonText}>_</Text>
          </View>

          <View style={styles.windowButton}>
            <Text style={styles.windowButtonText}>□</Text>
          </View>

          <View style={[styles.windowButton, styles.closeButton]}>
            <Pressable style={styles.closePressable} onPress={goToLogin}>
              <Text style={[styles.windowButtonText, styles.closeButtonText]}>
                ×
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  if (screenMode === 'menu') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

        <View style={styles.page}>
          <View style={styles.window}>
            {renderTitleBar('Uživatel - menu')}

            <View style={styles.menuBody}>
              <View style={styles.menuTopSection}>
                <View
                  style={[
                    styles.bigUserIconBox,
                    {
                      backgroundColor: userBgColour,
                      borderTopColor: userIconColour,
                      borderLeftColor: userIconColour,
                      borderRightColor: userIconColour,
                      borderBottomColor: userIconColour,
                    },
                  ]}
                >
                  <Image
                    source={getIconSource(userAvatarIcon)}
                    style={styles.menuUserIconImage}
                    resizeMode="contain"
                  />
                </View>

                <Text style={styles.menuHeading}>{currentUserName}</Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.menuButton,
                    isAvatarLocked && styles.menuButtonDisabled,
                    pressed && styles.sendButtonPressed,
                  ]}
                  onPress={() => {
                    if (isAvatarLocked) {
                      setBlockedInfo('Ikonka je uzamčená adminem a nelze ji změnit.');
                      return;
                    }

                    setIconModalVisible(true);
                  }}
                >
                  <Text style={[styles.menuButtonText, isAvatarLocked && styles.menuButtonTextDisabled]}>
                    {isAvatarLocked ? 'Ikonka je uzamčená' : 'Změnit ikonku'}
                  </Text>
                </Pressable>

                <View style={styles.adminMainMessageBox}>
                  <Text style={styles.adminMainMessageText}>
                    Sleduj status - tím zjistíš jestli ti aktuálně mohu pomoct (status je vidět nahoře v liště)
                  </Text>
                  <Text style={styles.adminMainMessageText}>
                    Když zádrhel nevyřešíme online lepší bude se sejít a problém vyřešit třeba u piva :D
                  </Text>
                  <Text style={styles.adminMainMessageText}>Žijem pouze jednou! Tak si hru hlavně užívej!!!</Text>
                </View>
              </View>

              <View style={styles.menuBottomSection}>
                <View style={styles.menuInfoBox}>
                  <Text style={styles.menuInfoText}>
                    Admin: {getAdminStatusText()}
                  </Text>

                  {unreadCount > 0 ? (
                    <Text style={styles.menuUnreadText}>
                      {unreadCount} {unreadCount === 1 ? 'nová zpráva' : 'nových zpráv'}
                    </Text>
                  ) : (
                    <Text style={styles.menuInfoText}>Žádné nové zprávy</Text>
                  )}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.chatButton,
                    styles.chatButtonGreenOutline,
                    unreadCount > 0 && styles.menuButtonUnread,
                    pressed && styles.sendButtonPressed,
                  ]}
                  onPress={openChat}
                >
                  <Text style={styles.chatButtonText}>
                    Chat{unreadCount > 0 ? ` (${unreadCount} nové)` : ''}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.statusBar}>
              <Text style={styles.statusText}>Připojeno jako uživatel</Text>
              <Text style={styles.statusText}>
                {unreadCount > 0 ? `${unreadCount} nových zpráv` : 'Menu'}
              </Text>
            </View>
          </View>

          <Modal
            visible={iconModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setIconModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalWindow}>
                <View style={styles.modalTitleBar}>
                  <Text style={styles.modalTitleText}>Výběr ikonky</Text>

                  <Pressable
                    style={styles.modalCloseButton}
                    onPress={() => setIconModalVisible(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>×</Text>
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Vyber ikonku uživatele:</Text>

                  <View style={styles.colourGrid}>
                    {USER_ICON_OPTIONS.map((iconItem) => (
                      <Pressable
                        key={iconItem.key}
                        style={({ pressed }) => [
                          styles.colourButton,
                          normalizeAvatarIcon(userAvatarIcon) === normalizeAvatarIcon(iconItem.key)
                            ? styles.iconButtonSelected
                            : null,
                          pressed && styles.sendButtonPressed,
                        ]}
                        onPress={() => changeUserAvatarIcon(iconItem.key)}
                      >
                        <Image
                          source={getIconSource(iconItem.key)}
                          style={styles.iconPreview}
                          resizeMode="contain"
                        />
                        <Text style={styles.colourButtonText}>{iconItem.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.window}>
          {renderTitleBar('Chat s adminem')}

          {isMuted ? (
            <View style={styles.muteBanner}>
              <Text style={styles.muteBannerText}>
                Jsi umlčený. Psát můžeš znovu za {muteTimeLeft}.
              </Text>
            </View>
          ) : null}

          <View style={styles.chatArea}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
            >
              {messages.map((item) => {
                const isUser = item.sender === 'user';
                const isSystem = item.sender === 'system';
                const messageTime = formatMessageTime(item.createdAt);

                if (isSystem) {
                  return (
                    <View key={item.id} style={styles.systemMessageRow}>
                      <View style={styles.systemMessageBox}>
                        <Text style={styles.systemMessageText}>{item.text}</Text>
                        <Text style={styles.systemMessageTime}>{messageTime}</Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isUser ? styles.messageRowUser : styles.messageRowAdmin,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isUser ? styles.userBubble : styles.adminBubble,
                      ]}
                    >
                      <View style={styles.messageAuthorRow}>
                        <Text style={styles.messageAuthor}>
                          {isUser ? 'Já' : 'Admin'}
                        </Text>

                        {!isUser ? (
                          <>
                            <View
                              style={[
                                styles.messageStatusDot,
                                isAdminOnline
                                  ? styles.statusOnline
                                  : isAdminJob
                                    ? styles.statusJob
                                    : styles.statusOffline,
                              ]}
                            />

                            <Text style={styles.messageStatusText}>
                              {getAdminStatusLabel()}
                            </Text>
                          </>
                        ) : null}

                        <Text style={styles.messageTime}>{messageTime}</Text>
                      </View>

                      <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {blockedInfo ? (
            <View style={styles.blockedInfoBox}>
              <Text style={styles.blockedInfoText}>{blockedInfo}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.helperBubble,
              pressed && styles.helperBubblePressed,
              isMuted && styles.helperBubbleDisabled,
            ]}
            onPress={useHelperMessage}
          >
            <Text
              style={[
                styles.helperBubbleLabel,
                isMuted && styles.helperBubbleTextDisabled,
              ]}
            >
              Pomocná věta:
            </Text>

            <Text
              style={[
                styles.helperBubbleText,
                isMuted && styles.helperBubbleTextDisabled,
              ]}
            >
              {currentHelperMessage}
            </Text>
          </Pressable>

          <View style={styles.inputPanel}>
            <TextInput
              value={message}
              onChangeText={(value) => {
                setBlockedInfo('');
                setMessage(value);
              }}
              placeholder={
                isMuted
                  ? `Umlčeno ještě na ${muteTimeLeft}`
                  : 'Napiš zprávu adminovi...'
              }
              placeholderTextColor="#666666"
              style={[styles.input, isMuted && styles.inputDisabled]}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!isMuted}
            />

            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                isMuted && styles.sendButtonDisabled,
                pressed && !isMuted && styles.sendButtonPressed,
              ]}
              onPress={sendMessage}
              disabled={isMuted}
            >
              <Text
                style={[
                  styles.sendButtonText,
                  isMuted && styles.sendButtonTextDisabled,
                ]}
              >
                Odeslat
              </Text>
            </Pressable>
          </View>

          <View style={styles.statusBar}>
            <Pressable onPress={() => setScreenMode('menu')}>
              <Text style={styles.statusText}>Zpět do menu</Text>
            </Pressable>

            <Text style={styles.statusText}>
              {isMuted
                ? `Umlčen: ${muteTimeLeft}`
                : `Admin: ${getAdminStatusText()}`}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default UzivatelPin;

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

  titleStatusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginLeft: 8,
  },

  titleStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 4,
    textTransform: 'uppercase',
  },

  statusOnline: {
    backgroundColor: '#28c840',
  },

  statusOffline: {
    backgroundColor: '#ff3b30',
  },

  statusJob: {
    backgroundColor: '#f5a623',
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

  closePressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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

  menuBody: {
    flex: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  menuTopSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
  },

  menuBottomSection: {
    width: '100%',
  },

  bigUserIconBox: {
    width: 98,
    height: 98,
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: '#f5f5f5',
  },

  menuUserIconImage: {
    width: 58,
    height: 58,
  },

  menuHeading: {
    color: '#000000',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
  },

  menuInfoBox: {
    width: '100%',
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    padding: 10,
    marginBottom: 10,
  },

  menuInfoText: {
    color: '#3a3200',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },

  menuUnreadText: {
    color: '#8a0000',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  menuButton: {
    width: '100%',
    height: 44,
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

  menuButtonDisabled: {
    backgroundColor: '#d7d7d7',
  },

  chatButton: {
    width: '100%',
    height: 88,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  chatButtonGreenOutline: {
    borderTopColor: '#67d977',
    borderLeftColor: '#67d977',
    borderRightColor: '#1e7a2e',
    borderBottomColor: '#1e7a2e',
  },

  adminMainMessageBox: {
    width: '100%',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#8aa8d8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  adminMainMessageText: {
    color: '#1d3557',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'left',
    marginBottom: 4,
  },

  menuButtonUnread: {
    backgroundColor: '#ffd7d7',
  },

  menuButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },

  menuButtonTextDisabled: {
    color: '#666666',
  },

  chatButtonText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '900',
  },

  muteBanner: {
    backgroundColor: '#ffd7d7',
    borderBottomWidth: 1,
    borderBottomColor: '#a80000',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  muteBannerText: {
    color: '#8a0000',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  chatArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    margin: 10,
    marginBottom: 6,
  },

  messagesScroll: {
    flex: 1,
  },

  messagesContent: {
    padding: 12,
    paddingBottom: 18,
  },

  messageRow: {
    width: '100%',
    marginBottom: 10,
    flexDirection: 'row',
  },

  messageRowAdmin: {
    justifyContent: 'flex-start',
  },

  messageRowUser: {
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
  },

  adminBubble: {
    backgroundColor: '#ece9d8',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  userBubble: {
    backgroundColor: '#dceaff',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
  },

  messageAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  messageAuthor: {
    color: '#003c9e',
    fontSize: 11,
    fontWeight: '900',
  },

  messageStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginLeft: 6,
  },

  messageStatusText: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 3,
    textTransform: 'uppercase',
  },

  messageTime: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 8,
  },

  messageText: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 19,
  },

  systemMessageRow: {
    alignItems: 'center',
    marginBottom: 10,
  },

  systemMessageBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '92%',
  },

  systemMessageText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  systemMessageTime: {
    color: '#6b5d00',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
  },

  blockedInfoBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    marginHorizontal: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  blockedInfoText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  helperBubble: {
    backgroundColor: '#fff8d7',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#b9a85c',
    borderBottomColor: '#b9a85c',
    marginHorizontal: 10,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  helperBubblePressed: {
    borderTopColor: '#b9a85c',
    borderLeftColor: '#b9a85c',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#fff1a8',
  },

  helperBubbleDisabled: {
    backgroundColor: '#d6d3c3',
    borderTopColor: '#aaaaaa',
    borderLeftColor: '#aaaaaa',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  helperBubbleLabel: {
    color: '#3a3200',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 3,
  },

  helperBubbleText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },

  helperBubbleTextDisabled: {
    color: '#777777',
  },

  inputPanel: {
    backgroundColor: '#ece9d8',
    borderTopWidth: 2,
    borderTopColor: '#ffffff',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 95,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 2,
    borderTopColor: '#6e6e6e',
    borderLeftColor: '#6e6e6e',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    textAlignVertical: 'top',
  },

  inputDisabled: {
    backgroundColor: '#d6d3c3',
    color: '#777777',
  },

  sendButton: {
    height: 42,
    minWidth: 88,
    marginLeft: 8,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  sendButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  sendButtonDisabled: {
    backgroundColor: '#d6d3c3',
    borderTopColor: '#aaaaaa',
    borderLeftColor: '#aaaaaa',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  sendButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  sendButtonTextDisabled: {
    color: '#777777',
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
    fontWeight: '700',
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
    maxWidth: 390,
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

  iconButtonSelected: {
    borderTopColor: '#1f7a1f',
    borderLeftColor: '#1f7a1f',
    borderRightColor: '#7df57d',
    borderBottomColor: '#7df57d',
    backgroundColor: '#e7ffe7',
  },

  iconPreview: {
    width: 26,
    height: 26,
    marginBottom: 6,
  },

  colourButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },
});