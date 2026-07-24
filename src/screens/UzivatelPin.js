

import React,{ useEffect,useRef,useState } from 'react';
import {
Animated,
AppState,
BackHandler,
Image,
Dimensions,
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

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  'Lubomír', 'Čestmír', 'Oldřich', 'Rudolf', 'Matyáš', 'Ivan', 'Robert', 'Luboš', 'Radim', 'Richard',
  'Vít', 'Bohumil', 'Šimon', 'Rostislav', 'Ivo', 'Luděk', 'Dušan', 'Kamil', 'Michael', 'Vladislav',
  'Zbyněk', 'Viktor', 'Bohuslav', 'Kryštof', 'Alois', 'René', 'Vítězslav', 'Tadeáš', 'Štefan', 'Eduard',
  'Marcel', 'Jan', 'Jozef', 'Samuel', 'Dalibor', 'Emil', 'Radomír', 'Luděk', 'Denis', 'Vilém',
  'Tobiáš', 'Jana', 'Marie', 'Eva', 'Hana', 'Anna', 'Lenka', 'Kateřina', 'Lucie', 'Věra',
  'Alena', 'Petra', 'Veronika', 'Jaroslava', 'Tereza', 'Martina', 'Michaela', 'Jitka', 'Helena', 'Ludmila',
  'Zdeňka', 'Ivana', 'Monika', 'Eliška', 'Zuzana', 'Markéta', 'Jarmila', 'Barbora', 'Jiřina', 'Marcela',
  'Kristýna', 'Dana', 'Dagmar', 'Adéla', 'Pavla', 'Vlasta', 'Miroslava', 'Andrea', 'Irena', 'Božena',
  'Klára', 'Libuše', 'Marta', 'Šárka', 'Nikola', 'Karolína', 'Iveta', 'Pavlína', 'Natálie', 'Olga',
  'Blanka', 'Gabriela', 'Renata', 'Aneta', 'Simona', 'Růžena', 'Radka', 'Daniela', 'Denisa', 'Iva',
  'Milada', 'Milena', 'Romana', 'Miloslava', 'Miluše', 'Ilona', 'Aneta', 'Soňa', 'Kamila', 'Stanislava',
  'Nela', 'Vladimíra', 'Naděžda', 'Květoslava', 'Danuse', 'Vendula', 'Drahomíra', 'Julie', 'Jindřiška', 'Emilie',
  'Viktorie',
];

const getRandomLocalUserName = () => {
  return LOCAL_RANDOM_USER_NAMES[Math.floor(Math.random() * LOCAL_RANDOM_USER_NAMES.length)] || 'UÄąÄľivatel';
};

const isPlaceholderUserName = (name) => {
  const normalized = String(name || '').trim().toLowerCase();

  return (
    !normalized ||
    normalized === 'uzivatel' ||
    normalized === 'uživatel' ||
    /^uzivatel\s*\d+$/.test(normalized) ||
    /^uÄąÄľivatel\s*\d+$/.test(normalized)
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
  'Může mě teleportovat na souřadnice [2,0]?',
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
const MUTE_ICON = require('../assets/icons/nemluv.png');
const HAHA_ICON = require('../assets/egg/hahanachytal.png');
const normalizeAdminIcon = (iconKey) => {
  const cleanIcon = String(iconKey || '').trim().toLowerCase();
  return USER_ICON_SOURCES[cleanIcon] && cleanIcon.startsWith('admin') ? cleanIcon : 'admin';
};

const USER_ICON_OPTIONS = [
  { key: 'uzivatel', label: 'uživatel' },
  { key: 'cat', label: 'kočka' },
  { key: 'pes', label: 'pes' },
  { key: 'devil', label: 'devil' },
  { key: 'klaun', label: 'klaun' },
  { key: 'happy', label: 'prsa' },
  { key: 'stop', label: 'stop' },
  { key: 'vykricnik', label: 'výstraha' },
  { key: 'zachod', label: 'zachod' },
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

const USER_READ_COUNTS_STORAGE_KEY = 'CUSIIK_USER_READ_COUNTS_PERSISTED';
const USER_AVATAR_STORAGE_KEY = 'CUSIIK_USER_AVATAR_PERSISTED';
const USER_ICON_COLOUR_STORAGE_KEY = 'CUSIIK_USER_ICON_COLOUR_PERSISTED';
const USER_BG_COLOUR_STORAGE_KEY = 'CUSIIK_USER_BG_COLOUR_PERSISTED';


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
  return `${totalDays} dnů`;
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
    chats[userId] = [];
  }

  return chats[userId];
};

const getAdminMessageCount=(messages)=>{
return messages.filter((item)=>item.sender==='admin').length;
};
const UnreadBadge=({ count })=>{
const scaleAnim=useRef(new Animated.Value(1)).current;
const prevCountRef=useRef(count);
useEffect(()=>{
if (prevCountRef.current===0 && count>0) {
scaleAnim.setValue(0);
Animated.sequence([
Animated.timing(scaleAnim,{ toValue:1.3,duration:180,useNativeDriver:true }),
Animated.timing(scaleAnim,{ toValue:1,duration:110,useNativeDriver:true }),
]).start();
} else if (count>prevCountRef.current) {
Animated.sequence([
Animated.timing(scaleAnim,{ toValue:0.5,duration:90,useNativeDriver:true }),
Animated.timing(scaleAnim,{ toValue:1.45,duration:140,useNativeDriver:true }),
Animated.timing(scaleAnim,{ toValue:1,duration:100,useNativeDriver:true }),
]).start();
}
prevCountRef.current=count;
},[count]);
if (count<=0) {
return null;
}
return (
<Animated.View style={[styles.chatUnreadCircle,{ transform:[{ scale:scaleAnim }] }]}>
<Text style={styles.chatUnreadCircleText}>{count}</Text>
</Animated.View>
);
};
const UzivatelPin=({ navigation,route })=>{

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
  const [secretMutedUsers, setSecretMutedUsers] = useState(getGlobalSecretMutedUsers());
  const [adminProfile, setAdminProfile] = useState(
    globalThis.CUSIIK_ADMIN_PROFILE || { icon: 'admin', silhouetteColour: '#0b3d91', bgColour: '#ece9d8' }
  );

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

  const [eggImages, setEggImages] = useState([]);
  const [eggMessageVisible, setEggMessageVisible] = useState(false);



  const [eggVisible, setEggVisible] = useState(false);
  const [eggPos, setEggPos] = useState({ top: 100, left: 50 });
  const [eggSize, setEggSize] = useState(150);


  useEffect(() => {
    globalThis.CUSIIK_CURRENT_USER_ID = currentUserId;
  }, [currentUserId]);

 useEffect(() => {
 screenMountAtRef.current = Date.now();
 initialSyncDoneRef.current = false;
 }, [currentUserId]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_READ_COUNTS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            globalThis.CUSIIK_USER_READ_COUNTS = parsed;
            if (parsed[currentUserId] !== undefined) {
              setReadAdminCount(parsed[currentUserId]);
            }
          }
        }
      } catch {}
    })();
  }, [currentUserId]);

  useEffect(() => {
    (async () => {
      try {
        const [storedIcon, storedIconColour, storedBgColour] = await Promise.all([
          AsyncStorage.getItem(USER_AVATAR_STORAGE_KEY),
          AsyncStorage.getItem(USER_ICON_COLOUR_STORAGE_KEY),
          AsyncStorage.getItem(USER_BG_COLOUR_STORAGE_KEY),
        ]);
        if (storedIcon) {
          const normalized = normalizeAvatarIcon(storedIcon);
          setUserAvatarIcon(normalized);
          globalThis.CUSIIK_USER_AVATAR_ICON = normalized;
        }
        if (storedIconColour) {
          setUserIconColour(storedIconColour);
          globalThis.CUSIIK_USER_ICON_COLOUR = storedIconColour;
        }
        if (storedBgColour) {
          setUserBgColour(storedBgColour);
          globalThis.CUSIIK_USER_BG_COLOUR = storedBgColour;
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    screenModeRef.current = screenMode;
    if (screenMode === 'chat') {
      globalThis.CUSIIK_ACTIVE_USER_CHAT_ID = String(currentUserId);
    } else if (String(globalThis.CUSIIK_ACTIVE_USER_CHAT_ID || '') === String(currentUserId)) {
      globalThis.CUSIIK_ACTIVE_USER_CHAT_ID = null;
    }
  }, [screenMode]);

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
      return 'job';
    }

    return 'offline';
  };
  const currentHelperMessage = HELPER_MESSAGES[helperMessageIndex];
  const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

  const adminMessageCount = getAdminMessageCount(messages);
  const unreadCount = Math.max(adminMessageCount - readAdminCount, 0);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 120);
  };

  const markMessagesAsRead = async (nextMessages = messages) => {
    const count = getAdminMessageCount(nextMessages);
    const nextReadCounts = {
      ...getGlobalUserReadCounts(),
      [currentUserId]: count,
    };

    globalThis.CUSIIK_USER_READ_COUNTS = nextReadCounts;
    setReadAdminCount(count);
    try {
      await AsyncStorage.setItem(USER_READ_COUNTS_STORAGE_KEY, JSON.stringify(nextReadCounts));
    } catch {}
  };

  const openChat = () => {
    const chats = getGlobalChats();
    const latestMessages = chats[currentUserId] || messages;
    setScreenMode('chat');
    markMessagesAsRead(latestMessages);
    scrollToBottom(false);
  };

  const getMuteUntil = () => {
    const mutedUsers = getGlobalMutedUsers();

    return serverMutedUsers[currentUserId] || mutedUsers[currentUserId] || 0;
  };

  const muteUntil = getMuteUntil();
  const isMuted = muteUntil > nowTick;
  const muteTimeLeft = isMuted ? formatMuteTimeLeft(muteUntil) : '';

  const prevIsMutedRef = useRef(isMuted);

  useEffect(() => {
    if (prevIsMutedRef.current && !isMuted) {
      const stillMutedUntil = getMuteUntil();
      if (stillMutedUntil <= Date.now()) {
        setBlockedInfo(`Už nejsi umlčený, můžeš znovu psát. (${formatMessageTime(Date.now())})`);
        setTimeout(() => {
          setBlockedInfo((current) => {
            if (current && current.includes('Už nejsi umlčený')) {
              return '';
            }
            return current;
          });
        }, 5000);
      }
    }
    if (!isMuted && blockedInfo && blockedInfo.includes('Jsi umlčen')) {
      const stillMutedUntil = getMuteUntil();
      if (stillMutedUntil <= Date.now()) {
        setBlockedInfo('');
      }
    }
    prevIsMutedRef.current = isMuted;
  }, [nowTick, isMuted, blockedInfo]);


  const refreshScreenData = () => {
    const chats = getGlobalChats();

    setNowTick(Date.now());

    if (!socket.connected) {
      setAdminStatus(getAdminStatus());
      setServerMutedUsers({ ...getGlobalMutedUsers() });
      setSecretMutedUsers({ ...getGlobalSecretMutedUsers() });
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
    const handleConnect = () => {
      screenMountAtRef.current = Date.now();
      initialSyncDoneRef.current = false;

      socket.emit('state:get');
      socket.emit('chat:get', {
        userId: currentUserId,
      });
    };

    const handleServerState = (serverState) => {
      if (serverState?.adminStatus) {
        setAdminStatus(serverState.adminStatus);
        globalThis.CUSIIK_ADMIN_STATUS = serverState.adminStatus;
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
          AsyncStorage.setItem(USER_ICON_COLOUR_STORAGE_KEY, nextSilhouette).catch(() => {});
        }

        if (currentUser?.bgColour) {
          setUserBgColour(currentUser.bgColour);
          globalThis.CUSIIK_USER_BG_COLOUR = currentUser.bgColour;
          AsyncStorage.setItem(USER_BG_COLOUR_STORAGE_KEY, currentUser.bgColour).catch(() => {});
        }

        if (currentUser?.avatarIcon) {
          const normalizedIcon = normalizeAvatarIcon(currentUser.avatarIcon);
          setUserAvatarIcon(normalizedIcon);
          globalThis.CUSIIK_USER_AVATAR_ICON = normalizedIcon;
          AsyncStorage.setItem(USER_AVATAR_STORAGE_KEY, normalizedIcon).catch(() => {});
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
        setSecretMutedUsers(serverState.secretMutedUsers);
        globalThis.CUSIIK_SECRET_MUTED_USERS = serverState.secretMutedUsers;
      }
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
      const looksLikeHistoricalSync =
        previousMessages.length === 0 && newestAdminAt > 0 && newestAdminAt < screenMountAtRef.current;
      const isInitialSync = !initialSyncDoneRef.current;

      if (isInitialSync) {
        initialSyncDoneRef.current = true;
        if (looksLikeHistoricalSync) {
          return;
        }
        if (screenModeRef.current === 'chat' || isActiveInThisChat) {
          markMessagesAsRead(safeMessages);
        } else if (nextUnread > previousUnread) {
          showLocalMessageNotification({
            title: 'Nová zpráva od admina',
            body: 'Máte novou zprávu v chatu.',
          });
        }
        return;
      }

      if (looksLikeHistoricalSync) {
        return;
      }

      const shouldNotify =
        !isActiveInThisChat &&
        screenModeRef.current !== 'chat' &&
        nextUnread > previousUnread;

      if (shouldNotify) {
        showLocalMessageNotification({
          title: 'Nová zpráva od admina',
          body: 'Máte novou zprávu v chatu.',
        });
      }

      if (screenModeRef.current === 'chat' || isActiveInThisChat) {
        markMessagesAsRead(safeMessages);
      }
    };

    const handleMuted = ({ userId, muteUntil: nextMuteUntil }) => {
      if (userId !== currentUserId) {
        return;
      }

      const nextMutedUsers = {
        ...getGlobalMutedUsers(),
        ...serverMutedUsers,
        [currentUserId]: nextMuteUntil,
      };

      globalThis.CUSIIK_MUTED_USERS = nextMutedUsers;
      setServerMutedUsers(nextMutedUsers);

      if (nextMuteUntil && nextMuteUntil > Date.now()) {
        setBlockedInfo(
        `Nemůžeš psát. Jsi umlčený ještě na ${formatMuteTimeLeft(nextMuteUntil)}.`
        );
      } else {
        setBlockedInfo(`Už nejsi umlčený, můžeš znovu psát. (${formatMessageTime(Date.now())})`);
        setTimeout(() => {
          setBlockedInfo((current) => {
            if (current && current.includes('Už nejsi umlčený')) {
              return '';
            }
            return current;
          });
        }, 5000);
      }
    };

    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('chat:muted', handleMuted);
    socket.on('connect', handleConnect);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('chat:muted', handleMuted);
      socket.off('connect', handleConnect);
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
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        Keyboard.dismiss();
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, []);

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

    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'PinEntry' }],
      });
    } catch {
      navigation.replace('PinEntry');
    }
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
      setBlockedInfo('Ikonka je uzamčena adminem a nelze ji změnit.');
      setIconModalVisible(false);
      return;
    }

    const normalizedIcon = normalizeAvatarIcon(iconKey);

    setUserAvatarIcon(normalizedIcon);
    globalThis.CUSIIK_USER_AVATAR_ICON = normalizedIcon;
    AsyncStorage.setItem(USER_AVATAR_STORAGE_KEY, normalizedIcon).catch(() => {});

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

    const triggerHahaEgg = () => {
    const screenDim = Dimensions.get('window');
    const baseSize = 110;

    const nextImages = Array.from({ length: 3 }).map((_, index) => {
      const scale = Math.random() * 0.7 + 0.6;
      const size = Math.round(baseSize * scale);
      const maxTop = Math.max(screenDim.height - size - 80, 40);
      const maxLeft = Math.max(screenDim.width - size - 20, 10);
      const top = Math.floor(Math.random() * maxTop) + 30;
      const left = Math.floor(Math.random() * maxLeft) + 10;

      return {
        id: `${Date.now()}-${index}`,
        top,
        left,
        size,
      };
    });

    setEggMessageVisible(false);
    setEggImages(nextImages);
  };

  const closeHahaImage = (id) => {
    setEggImages((current) => {
      const nextImages = current.filter((item) => item.id !== id);

      if (nextImages.length === 0) {
        setEggMessageVisible(true);
      }

      return nextImages;
    });
  };

  const closeHahaMessage = () => {
    setEggMessageVisible(false);
  };

  const renderTitleBar = (title) => {

    const handleTopBack = () => {
      if (screenMode === 'chat') {
        setScreenMode('menu');
        return;
      }

      goToLogin();
    };

        const handleMinimize = () => {
      if (screenMode === 'chat') {
        triggerHahaEgg();
        return;
      }

      if (Platform.OS === 'android') {
        try {
          BackHandler.moveTaskToBack();
        } catch {}
      }
    };

    const handleClose = () => {
      if (screenMode === 'chat') {
        triggerHahaEgg();
        return;
      }

      goToLogin();
    };

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

                    {isMuted ? (
            <View style={styles.titleMuteIconBox}>
              <Image
                source={MUTE_ICON}
                style={styles.titleMuteIcon}
                resizeMode="contain"
              />
            </View>
          ) : null}

       
        </View>

        <View style={styles.windowButtons}>
          <View style={styles.windowButton}>
            <Pressable
              style={styles.closePressable}
              onPress={handleTopBack}
            >
              <Text style={styles.windowButtonText}>←</Text>
            </Pressable>
          </View>

          <View style={styles.windowButton}>
            <Pressable
              style={styles.closePressable}
              onPress={handleMinimize}
            >
              <Text style={styles.windowButtonText}>_</Text>
            </Pressable>
          </View>

                    <View style={[styles.windowButton, styles.closeButton]}>
            <Pressable style={styles.closePressable} onPress={handleClose}>
              <Text style={[styles.windowButtonText, styles.closeButtonText]}>
                X
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
            {renderTitleBar('Menu')}

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
                      setBlockedInfo('Ikonka je uzamčena adminem a nelze ji změnit.');
                      return;
                    }

                    setIconModalVisible(true);
                  }}
                >
                  <Text style={[styles.menuButtonText, isAvatarLocked && styles.menuButtonTextDisabled]}>
                    {isAvatarLocked ? 'Ikonka je uzamčena' : 'Změnit ikonku'}
                  </Text>
                </Pressable>

                <View style={styles.adminMainMessageBox}>
                  <Text style={styles.adminMainMessageText}>
                    Sleduj status - tím zjistíš jestli ti aktuálně mohu pomoct (status je vidět nahoře v liště)
                  </Text>
                  <Text style={styles.adminMainMessageText}>
                    Když zadrhel nevyřešíme online lepší bude se sejít a problém vyřešit třeba u piva :D
                  </Text>
                  <Text style={styles.adminMainMessageText}>Žijem pouze jednou! Tak si hru hlavně užívej!!!</Text>
                </View>
              </View>

              <View style={styles.menuBottomSection}>
<Pressable
style={({ pressed })=>[
styles.chatButton,
styles.chatButtonGreenOutline,
unreadCount>0 && styles.menuButtonUnread,
pressed && styles.sendButtonPressed,
]}
onPress={openChat}
>
<View style={styles.chatButtonLeft}>
<View
style={[
styles.chatButtonIconBox,
{
backgroundColor:adminProfile?.bgColour||'#ece9d8',
borderTopColor:adminProfile?.silhouetteColour||'#0b3d91',
borderLeftColor:adminProfile?.silhouetteColour||'#0b3d91',
borderRightColor:adminProfile?.silhouetteColour||'#0b3d91',
borderBottomColor:adminProfile?.silhouetteColour||'#0b3d91',
},
]}
>
<Image
source={getIconSource(adminProfile?.icon||'admin')}
style={styles.chatButtonIconImage}
resizeMode="contain"
/>
</View>
<View style={styles.chatButtonTextBox}>
<View style={styles.chatButtonNameRow}>
<Text style={styles.chatButtonAdminName}>Admin</Text>
<UnreadBadge count={unreadCount}/>
</View>

<Text style={styles.chatButtonAdminStatus}>{getAdminStatusText()}</Text>
</View>
</View>
<Text style={styles.chatButtonArrowText}>→ Chatuj</Text>
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
                    <Text style={styles.modalCloseButtonText}>x</Text>
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

      <KeyboardWrapper
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.window}>
          {renderTitleBar('Chat s adminem')}

          {isMuted ? (
            <View style={styles.muteBanner}>
              <Text style={styles.muteBannerText}>
                Jsi umlčen. Psát můžeš znovu za {muteTimeLeft}.
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

                const myOutlineColour = userIconColour || '#0b3d91';
                const myBgColour = userBgColour || '#ece9d8';
                const adminOutlineColour = adminProfile?.silhouetteColour || '#0b3d91';
                const adminBgColour = adminProfile?.bgColour || '#ece9d8';
                const iconOutlineColour = isUser ? myOutlineColour : adminOutlineColour;
                const iconBgColour = isUser ? myBgColour : adminBgColour;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isUser ? styles.messageRowUser : styles.messageRowAdmin,
                    ]}
                  >
                    <View style={[styles.miniIconWrapper, { borderColor: iconOutlineColour, backgroundColor: iconBgColour, borderWidth: 2 }]}>
                      <Image
                        source={getIconSource(isUser ? (userAvatarIcon || 'uzivatel') : (adminProfile?.icon || 'admin'))}
                        style={styles.miniIconImage}
                        resizeMode="contain"
                      />
                    </View>
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
              Pomocná včta:
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
                ? `Umlčeno: ${muteTimeLeft}`
                : `Admin: ${getAdminStatusText()}`}
            </Text>
          </View>
        </View>
            </KeyboardWrapper>

      <Modal
        visible={eggImages.length > 0 || eggMessageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setEggImages([]);
          setEggMessageVisible(false);
        }}
      >
        <View style={styles.eggOverlay}>
          {eggImages.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => closeHahaImage(item.id)}
              style={[
                styles.eggImageWrapper,
                {
                  top: item.top,
                  left: item.left,
                  width: item.size,
                  height: item.size,
                },
              ]}
            >
              <Image
                source={HAHA_ICON}
                style={styles.eggImage}
                resizeMode="contain"
              />
            </Pressable>
          ))}

          {eggMessageVisible ? (
            <Pressable style={styles.eggMessageOverlay} onPress={closeHahaMessage}>
              <Text style={styles.eggMessageText}>HAHA, neříkaj ti náhodou Nachytanec ? :P :D</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>
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

    titleMuteIconBox: {
    width: 22,
    height: 22,
    marginLeft: 6,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleMuteIcon: {
    width: 16,
    height: 16,
    tintColor: '#ff3b30',
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
    justifyContent: 'space-between',
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 2,
  },

  chatButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  chatButtonIconBox: {
    width: 44,
    height: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  chatButtonIconImage: {
    width: 28,
    height: 28,
  },

  chatButtonTextBox: {
    flexShrink: 1,
  },

  chatButtonNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  chatButtonAdminName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },

  chatButtonAdminStatus: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'capitalize',
  },

  chatUnreadCircle: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff3b30',
    borderWidth: 1,
    borderColor: '#a80000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },

  chatUnreadCircleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  chatButtonArrowText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
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
    alignItems: 'center',
  },

  miniIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ece9d8',
    borderWidth: 1,
    borderColor: '#aaa793',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginLeft: 2,
    marginBottom: 2,
  },

  miniIconImage: {
    width: 20,
    height: 20,
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

  eggOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },

  eggImageWrapper: {
    position: 'absolute',
  },

  eggImage: {
    width: '100%',
    height: '100%',
  },

  eggMessageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eggMessageText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 24,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

