

import React,{ useEffect,useRef,useState } from 'react';
import {
Alert,
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
TouchableWithoutFeedback,
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
  setAppBadgeCount,
} from '../notifications';
import {
  playInAppChatMessageSound,
  playInAppMessageSound,
} from '../utils/inAppSound';
import { StatusAnimation } from '../components/StatusAnimations';
import { AvatarIcon } from '../components/AvatarIcon';


const resolveCurrentUserId = (routeUserId) => {
  const cleanRouteUserId = String(routeUserId || '').trim();

  if (cleanRouteUserId) {
    return cleanRouteUserId;
  }

  const globalUserId = globalThis.CUSIIK_CURRENT_USER_ID;
  const cleanGlobalUserId = String(globalUserId || '').trim();

  return cleanGlobalUserId;
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

const HELPER_MESSAGE_GM = 'GM sem lvl 80 a spadl sem pod texturu na 49.2 62.8 v Dalaranu, portni me pls.';
const ANNOUNCEMENT_PREFIX = '[[ANNOUNCEMENT]]';
const ANNOUNCEMENT_TIMEOUT_MS = 10 * 60 * 1000;

const WALL_MESSAGE_MAX_LENGTH = 100;

const getGlobalWallMessage = () => {
  return globalThis.CUSIIK_WALL_MESSAGE || null;
};

const formatAnnouncementCountdown = (expiresAt) => {
  const remainingSeconds = Math.max(0, Math.ceil((Number(expiresAt || 0) - Date.now()) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const MESSAGE_REACTIONS = [
  { key: 'happy', emoji: '😄', colour: '#35c759' },
  { key: 'love', emoji: '❤️', colour: '#ff6fb7' },
  { key: 'wow', emoji: '😮', colour: '#ffcc00' },
  { key: 'sad', emoji: '😢', colour: '#4f9eff' },
  { key: 'angry', emoji: '😡', colour: '#ff3b30' },
];

const getReactionByKey = (key) => {
  return MESSAGE_REACTIONS.find((item) => item.key === key) || null;
};

const getMessageReactions = (message) => {
  if (message?.reactions && typeof message.reactions === 'object') {
    return {
      user: message.reactions.user || null,
      admin: message.reactions.admin || null,
    };
  }

  return {
    user: message?.reaction || null,
    admin: null,
  };
};

const hexToRgba = (hex, alpha = 0.18) => {
  const cleanHex = String(hex || '').replace('#', '');

  if (cleanHex.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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

const HAHA_ICON = require('../assets/egg/hahanachytal.png');
const LOGO_ICON = require('../assets/icons/logoxp.png');
const BACK_ICON = require('../assets/icons/backsipka.png');
const HELP_ICON = require('../assets/icons/otaznik.png');
const MINIMIZE_ICON = require('../assets/icons/minimalize.png');
const EXIT_ICON = require('../assets/icons/exit.png');
const FOOT_ICON = require('../assets/icons/noha.png');
const FOOT_MESSAGE = '[[FOOT_IMAGE]]';



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
  { key: 'happy', label: 'happy' },
  { key: 'prase', label: 'prase' },
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

  if (cleanIcon === 'vykricnik' || cleanIcon === 'prsa' || cleanIcon === 'pras') {
    return 'prase';
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
const AnimatedMessageRow = ({ children, style }) => {
  const rowOpacity = useRef(new Animated.Value(0)).current;
  const rowTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rowOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(rowTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[style, { opacity: rowOpacity, transform: [{ translateY: rowTranslateY }] }]}
    >
      {children}
    </Animated.View>
  );
};
const PulsingDot = ({ active, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop?.();
      pulseAnim.setValue(1);
    }

    return () => {
      loopRef.current?.stop?.();
    };
  }, [active]);

  return <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]} />;
};

const ChatButtonPulseWrapper = ({ active, children, style }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.02, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop?.();
      pulseAnim.setValue(1);
    }

    return () => {
      loopRef.current?.stop?.();
    };
  }, [active]);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
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

const RATING_STATS = [
  { key: 'sila', label: 'Síla', value: 5 },
  { key: 'vydrz', label: 'Výdrž', value: 5 },
  { key: 'obratnost', label: 'Obratnost', value: 5 },
  { key: 'charisma', label: 'Charisma', value: 5 },
  { key: 'stesti', label: 'Štěstí', value: 5 },
];

const TOP_SCORE_ROWS = [
  'Tomáš',
  'Pavel',
  'Lucie',
  'Martin',
  'Karel',
  'Jana',
  'David',
  'Eva',
  'Milan',
  'Ondřej',
];

const RatingSlider = ({ label, value, locked }) => {
  const percent = Math.max(0, Math.min(100, ((value - 1) / 9) * 100));

  return (
    <View style={styles.ratingRow}>
      <View style={styles.ratingLabelRow}>
        <Text style={styles.ratingLabelText}>{label}</Text>
        <Text style={styles.ratingValueText}>{value}/10</Text>
      </View>

      <View style={styles.ratingTrackWrap}>
        <Text style={styles.ratingEndLabel}>1</Text>

        <View style={styles.ratingTrack}>
          <View style={styles.ratingTrackFill} />

          <View style={[styles.ratingTrackDot, { left: `${percent}%` }]}>
            {locked ? <Text style={styles.ratingLockIcon}>🔒</Text> : null}
          </View>
        </View>

        <Text style={styles.ratingEndLabel}>10</Text>
      </View>
    </View>
  );
};

const getUnreadMessageLabel = (count) => {
  if (count === 1) {
    return '+1 nová zpráva';
  }

  return `+${count} nové zprávy`;
};

const UzivatelPin=({ navigation,route })=>{

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const shouldScrollToReactionPickerRef = useRef(false);
  const initialSyncDoneRef = useRef(false);
  const screenMountAtRef = useRef(Date.now());
  const screenModeRef = useRef('menu');
  // FIX: userId uz neni konstanta z route params. Kdyz se server restartuje
  // (nebo nas po reconnectu prihlasi pod novym ID), prijde auth:success
  // s jinym ID - driv jsme o tom nevedeli a vsechny prichozi eventy se
  // zahodily (zpravy, reakce, barvy, ikonka se prestaly aktualizovat).
  const [currentUserId, setCurrentUserId] = useState(
    () => resolveCurrentUserId(route?.params?.userId)
  );
  const [currentUserName, setCurrentUserName] = useState(getCurrentUserName());
  const [screenMode, setScreenMode] = useState('menu');

  // "Otevřít" z notifikace -> rovnou do chatu
  useEffect(() => {
    if (route?.params?.openChat) {
      setScreenMode('chat');
    }
  }, [route?.params?.openChat]);
  const [iconModalVisible, setIconModalVisible] = useState(false);
  const [tomobloxModalVisible, setTomobloxModalVisible] = useState(false);
  const [tomobloxBoxes, setTomobloxBoxes] = useState('');
  const [tomobloxCoins, setTomobloxCoins] = useState('');
  const [tomobloxError, setTomobloxError] = useState('');
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [helperMenuVisible, setHelperMenuVisible] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const [, setAnnouncementTick] = useState(0);
  const [inAppToast, setInAppToast] = useState(null);
  const dismissedAnnouncementIdRef = useRef(null);
  const [reactingMessageId, setReactingMessageId] = useState(null);

  const screenSlideAnim = useRef(new Animated.Value(0)).current;
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const prevScreenModeRef = useRef('menu');
  const screenWidth = Dimensions.get('window').width;


  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(getInitialMessages);
  const [adminStatus, setAdminStatus] = useState(getAdminStatus());
  const [connectionText, setConnectionText] = useState(
    socket.connected ? 'Server online' : 'Připojuji server...'
  );
  const connectionTextTimeoutRef = useRef(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [blockedInfo, setBlockedInfo] = useState('');
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
  const [taskLockNotice, setTaskLockNotice] = useState(null);
  const [ratingUnlocked, setRatingUnlocked] = useState(false);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingCharisma, setRatingCharisma] = useState(5);
  const [ratingStesti, setRatingStesti] = useState(5);

  const [wallMessage, setWallMessage] = useState(getGlobalWallMessage);
  const [wallDraft, setWallDraft] = useState('');

  const [eggVisible, setEggVisible] = useState(false);
  const [eggPos, setEggPos] = useState({ top: 100, left: 50 });
  const [eggSize, setEggSize] = useState(150);

  const terminalCursorAnim = useRef(new Animated.Value(1)).current;
  const terminalScanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const cursorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(terminalCursorAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(terminalCursorAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    const scanLoop = Animated.loop(
      Animated.timing(terminalScanAnim, {
        toValue: 1,
        duration: 2600,
        useNativeDriver: true,
      })
    );

    cursorLoop.start();
    scanLoop.start();

    return () => {
      cursorLoop.stop();
      scanLoop.stop();
    };
  }, []);


  useEffect(() => {
    if (!currentUserId) {
      navigation.replace('PinEntry');
      return;
    }

    globalThis.CUSIIK_CURRENT_USER_ID = currentUserId;
  }, [currentUserId, navigation]);

 useEffect(() => {
 screenMountAtRef.current = Date.now();
 initialSyncDoneRef.current = false;
 }, [currentUserId]);

  useEffect(() => {
    if (!announcement) {
      return undefined;
    }

    const tick = () => {
      if (!announcement || !announcement.expiresAt) {
        return;
      }

      const remaining = Number(announcement.expiresAt) - Date.now();
      if (remaining <= 0) {
        // FIX: po vyprseni uz se nesmi vratit
        dismissedAnnouncementIdRef.current = announcement.id;
        setAnnouncement(null);
        return;
      }

      // FIX: bez tohohle se odpocet neprekresloval (stal na miste)
      setAnnouncementTick((value) => value + 1);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [announcement?.id]);

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

    const goingToChat = screenMode === 'chat' && prevScreenModeRef.current === 'menu';
    const goingToMenu = screenMode === 'menu' && prevScreenModeRef.current === 'chat';

    if (goingToChat || goingToMenu) {
      screenSlideAnim.setValue(goingToChat ? screenWidth : -screenWidth);
      screenFadeAnim.setValue(0.4);

      Animated.parallel([
        Animated.timing(screenSlideAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(screenFadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    }

    prevScreenModeRef.current = screenMode;
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
  const KeyboardWrapper = KeyboardAvoidingView;


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
    setAppBadgeCount(0); // precteno -> ikonka na plose bez cisla

    const latestAdminMessage = [...nextMessages]
      .reverse()
      .find((item) => item?.sender === 'admin');

    if (socket.connected && latestAdminMessage?.createdAt) {
      socket.emit('chat:read', {
        userId: currentUserId,
        readAt: Number(latestAdminMessage.createdAt),
      });
    }

    try {
      await AsyncStorage.setItem(USER_READ_COUNTS_STORAGE_KEY, JSON.stringify(nextReadCounts));
    } catch {}
  };

  const openChat = () => {
    if (isAvatarLocked) {
      setTaskLockNotice('Splň úkol!');
      setBlockedInfo('Splň úkol!');
      setScreenMode('menu');
      return;
    }

    const chats = getGlobalChats();
    const latestMessages = chats[currentUserId] || messages;
    setScreenMode('chat');
    markMessagesAsRead(latestMessages);
    setInAppToast(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 140);
    scrollToBottom(false);
  };

  const openTomobloxInfo = () => {
    setTomobloxError('');
    setTomobloxModalVisible(true);
  };

  const submitTomobloxInfo = () => {
    const boxes = tomobloxBoxes.trim();
    const coins = tomobloxCoins.trim();
    if (!boxes && !coins) {
      setTomobloxError('Vyplň TomoBlox bedny nebo TomoBlox Coins.');
      return;
    }

    socket.emit('user:tomobloxInfo', { boxes, coins });
    setTomobloxBoxes('');
    setTomobloxCoins('');
    setTomobloxError('');
    setTomobloxModalVisible(false);
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
      if (connectionTextTimeoutRef.current) {
        clearTimeout(connectionTextTimeoutRef.current);
        connectionTextTimeoutRef.current = null;
      }
      setConnectionText('Server online');
      try {
        // FIX: re-auth posilame JEN s PINem, kterym se login opravdu povedl.
        // Po reconnectu posíláme pouze poslední platný PIN.
        // to bral jako spatny pokus (5x = blok IP na 15 minut) a socket zustal
        // bez role, takze uz nefungovalo nic "online".
        const knownPin = String(globalThis.CUSIIK_USER_PIN || '').replace(/[^0-9]/g,'').slice(0,5);
        const deviceId = String(globalThis.CUSIIK_DEVICE_ID || '').trim();
        const lastId = String(globalThis.CUSIIK_CURRENT_USER_ID || globalThis.CUSIIK_LAST_USER_ID || currentUserId || '').trim();

        if (knownPin.length === 5 && (globalThis.CUSIIK_REAUTH_FAILS || 0) < 3) {
          socket.emit('auth:attempt', {
            pin: knownPin,
            deviceId: deviceId || undefined,
            lastUserId: lastId || undefined,
          });
        }
      } catch {}
      socket.emit('state:get');
      const pushToken = globalThis.CUSIIK_EXPO_PUSH_TOKEN;
      if (pushToken) {
        socket.emit('notifications:registerToken', {
          token: pushToken,
          role: 'user',
          userId: globalThis.CUSIIK_CURRENT_USER_ID || currentUserId,
          deviceId: globalThis.CUSIIK_DEVICE_ID || null,
        });
      }
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
      // FIX: server posila ID jako string, porovnavame bezpecne
      if (String(userId || '') !== String(currentUserId || '')) {
        return;
      }

      const chats = getGlobalChats();
      const previousMessages = chats[currentUserId] || [];
      const incomingMessages = nextMessages || [];
      const announcementMessages = incomingMessages.filter(
        (item) => item?.sender === 'system' && String(item?.text || '').startsWith(ANNOUNCEMENT_PREFIX)
      );
      const newestAnnouncement = announcementMessages[announcementMessages.length - 1];
      const safeMessages = incomingMessages.filter(
        (item) => !String(item?.text || '').startsWith(ANNOUNCEMENT_PREFIX)
      );

      if (newestAnnouncement && String(newestAnnouncement.id) !== dismissedAnnouncementIdRef.current) {
        // FIX: odpocet se pocita od odeslani oznameni. Driv Date.now() ->
        // kazda nova zprava resetovala casovac na 10:00 a po vyprseni
        // se oznameni s dalsi zpravou vratilo.
        const sentAt = Number(newestAnnouncement.createdAt || Date.now());
        const expiresAt = sentAt + ANNOUNCEMENT_TIMEOUT_MS;

        if (expiresAt > Date.now()) {
          setAnnouncement((current) =>
            current?.id === String(newestAnnouncement.id)
              ? current
              : {
                  id: String(newestAnnouncement.id),
                  text: String(newestAnnouncement.text).slice(ANNOUNCEMENT_PREFIX.length),
                  expiresAt,
                }
          );
        } else {
          dismissedAnnouncementIdRef.current = String(newestAnnouncement.id);
        }
      }
      const previousAdminMessages = previousMessages.filter(
        (item) => item.sender === 'admin'
      ).length;
      const nextAdminMessages = safeMessages.filter(
        (item) => item.sender === 'admin'
      ).length;

      chats[currentUserId] = safeMessages;
      setMessages(safeMessages);

      safeMessages.filter((item) => item.selfDestruct && (item.sender === 'admin' || item.sender === 'system')).forEach((item) => {
        socket.emit('message:read', { userId: currentUserId, messageId: item.id });
      });

      const currentReadCount = getGlobalUserReadCounts()[currentUserId] || 0;
      const previousUnread = Math.max(previousAdminMessages - currentReadCount, 0);
      const nextUnread = Math.max(nextAdminMessages - currentReadCount, 0);
      setAppBadgeCount(nextUnread); // cislo na ikonce appky
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
          playInAppMessageSound();
          showLocalMessageNotification({
            title: 'Nová zpráva od admina',
            body: String(newestAdminMessage?.text || 'Máte novou zprávu v chatu.').slice(0, 120),
            data: { userId: currentUserId, action: 'openChat', role: 'user' },
          });
        }
        return;
      }

      if (looksLikeHistoricalSync) {
        return;
      }

      const isInActiveChat = isActiveInThisChat || screenModeRef.current === 'chat';
      const shouldPlayChatSound = isInActiveChat && nextUnread > previousUnread;

      if (shouldPlayChatSound) {
        playInAppChatMessageSound();
      }

      const shouldNotify =
        !isActiveInThisChat &&
        screenModeRef.current !== 'chat' &&
        nextUnread > previousUnread;

      if (shouldNotify) {
        playInAppMessageSound();
        const latestAdminMessageText = String(newestAdminMessage?.text || 'Máte novou zprávu v chatu.');
        // FIX: uzivatel dostava stejnou notifikaci jako admin (Odpovědět + Otevřít)
        // i kdyz ma appku otevrenou - driv jen interni toast, ktery nevyskakoval
        showLocalMessageNotification({
          title: 'Nová zpráva od admina',
          body: latestAdminMessageText.slice(0, 120),
          data: { userId: currentUserId, action: 'openChat', role: 'user' },
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

    const handleTaskLock = ({ enabled, message }) => {
      if (!enabled) {
        setTaskLockNotice(null);
        setBlockedInfo('');
        return;
      }

      setTaskLockNotice(message || 'Splň úkol!');
      setBlockedInfo(message || 'Splň úkol!');
      setScreenMode('menu');
      if (screenMode === 'chat') {
        setTimeout(() => {
          setScreenMode('menu');
        }, 0);
      }
    };

    const handleRatingUnlock = (data) => {
      const targetUserId = data?.userId;

      if (targetUserId !== undefined && String(targetUserId) !== String(currentUserId)) {
        return;
      }

      const nextEnabled = Boolean(data?.enabled);

      setRatingUnlocked(nextEnabled);

      if (nextEnabled) {
        setRatingCharisma(5);
        setRatingStesti(5);
        setRatingModalVisible(true);
      } else {
        setRatingModalVisible(false);
      }
    };

    const handleDisconnect = () => {
      setConnectionText('Server offline - lokální režim');
    };

    const handleConnectError = () => {
      setConnectionText('Server nedostupný - lokální režim');
    };

    const handleUserKicked = async ({ userId, preserveIdentity, specialPin } = {}) => {
      if (String(userId) !== String(currentUserId)) return;
      if (preserveIdentity) {
        globalThis.CUSIIK_LAST_USER_ID = String(userId);
        await AsyncStorage.setItem('lastUserId', String(userId));
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = specialPin || null;
      } else {
        await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
        globalThis.CUSIIK_LAST_USER_ID = null;
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = null;
      }
      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      navigation.replace('PinEntry');
    };

    const handleRoomKicked = async () => {
      await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
      globalThis.CUSIIK_LAST_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = null;
      navigation.replace('PinEntry');
    };

    // FIX: po reconnectu nam server muze vratit jine userId -> prevezmeme ho,
    // jinak by nam prestaly chodit zpravy i zmeny profilu
    const handleAuthSuccess = async (payload) => {
      if (payload?.role !== 'user' || !payload?.userId) {
        return;
      }

      const nextUserId = String(payload.userId);

      globalThis.CUSIIK_CURRENT_ROLE = 'user';
      globalThis.CUSIIK_CURRENT_USER_ID = nextUserId;
      globalThis.CUSIIK_LAST_USER_ID = nextUserId;

      if (payload.userName) {
        globalThis.CUSIIK_CURRENT_USER_NAME = payload.userName;
        setCurrentUserName(payload.userName);
      }

      try {
        await AsyncStorage.setItem('lastUserId', nextUserId);
      } catch {}

      if (nextUserId !== String(currentUserId || '')) {
        initialSyncDoneRef.current = false;
        setCurrentUserId(nextUserId);
      }
    };

    // FIX: driv selhal re-auth uplne potichu a uzivatel jen koukal,
    // ze mu nic nechodi. Ted to aspon vidi v liste.
    const handleAuthError = (payload) => {
      setConnectionText(payload?.message || 'Přihlášení vypršelo - přihlaš se znovu.');
    };

    const handleAuthWaiting = () => {
      setConnectionText('Čeká se na schválení zařízení adminem.');
    };

    socket.on('auth:success', handleAuthSuccess);
    socket.on('auth:error', handleAuthError);
    socket.on('auth:waiting', handleAuthWaiting);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('chat:muted', handleMuted);
    socket.on('user:task-lock', handleTaskLock);
    socket.on('admin:unlockRating', handleRatingUnlock);
    socket.on('user:kicked', handleUserKicked);
    socket.on('room:kicked', handleRoomKicked);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('auth:success', handleAuthSuccess);
      socket.off('auth:error', handleAuthError);
      socket.off('auth:waiting', handleAuthWaiting);
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('chat:muted', handleMuted);
      socket.off('user:task-lock', handleTaskLock);
      socket.off('admin:unlockRating', handleRatingUnlock);
      socket.off('user:kicked', handleUserKicked);
      socket.off('room:kicked', handleRoomKicked);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, [currentUserId]);

  useEffect(() => {
    const handleWallMessage = (data) => {
      if (!data || !data.text) {
        return;
      }

      const nextWallMessage = {
        text: String(data.text).slice(0, WALL_MESSAGE_MAX_LENGTH),
        author: data.author || 'Anonym',
        createdAt: data.createdAt || Date.now(),
      };

      globalThis.CUSIIK_WALL_MESSAGE = nextWallMessage;
      setWallMessage(nextWallMessage);
    };

    socket.on('wall:message', handleWallMessage);

    if (socket.connected) {
      socket.emit('wall:get');
    }

    return () => {
      socket.off('wall:message', handleWallMessage);
    };
  }, []);



  useEffect(() => {
    if (isAvatarLocked) {
      setTaskLockNotice('Splň úkol!');
      setBlockedInfo('Splň úkol!');
      if (screenMode === 'chat') {
        setScreenMode('menu');
      }
    } else {
      setTaskLockNotice(null);
      if (blockedInfo === 'Splň úkol!') {
        setBlockedInfo('');
      }
    }
  }, [isAvatarLocked, screenMode, blockedInfo]);

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

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeReactionPicker();

      if (screenMode === 'chat') {
        setScreenMode('menu');
      } else {
        goToLogin();
      }

      return true;
    });

    return () => backSubscription.remove();
  }, [screenMode, navigation]);

  const saveMessages = (nextMessages) => {
    const chats = getGlobalChats();
    const limitedMessages = nextMessages.slice(-200);

    chats[currentUserId] = limitedMessages;
    setMessages(limitedMessages);
  };

  const toggleReactionPicker = (messageId) => {
    const isOpeningPicker = reactingMessageId !== messageId;
    const isLastMessage = messages.length > 0 && String(messages[messages.length - 1]?.id) === String(messageId);

    setReactingMessageId((current) => (current === messageId ? null : messageId));

    if (isOpeningPicker && isLastMessage) {
      shouldScrollToReactionPickerRef.current = true;
    }
  };

   const setMessageReaction = (messageId, reactionKey) => {
    const targetMessage = messages.find((item) => item.id === messageId);
    const currentReactions = getMessageReactions(targetMessage);
    const nextReaction = currentReactions.user === reactionKey ? null : reactionKey;

    const nextMessages = messages.map((item) =>
      item.id === messageId
        ? {
            ...item,
            reaction: undefined,
            reactions: { ...getMessageReactions(item), user: nextReaction },
          }
        : item
    );

    saveMessages(nextMessages);
    setReactingMessageId(null);

    if (socket.connected) {
      socket.emit('chat:react', {
        userId: currentUserId,
        messageId,
        reaction: nextReaction,
      });
    }
  };

  const closeReactionPicker = () => {
    setReactingMessageId(null);
  };

  const insertHelperMessage = (text) => {
    closeReactionPicker();
    setHelperMenuVisible(false);

    if (isAvatarLocked) {
      playInAppMessageSound();
      setBlockedInfo('Ikonka je uzamčena adminem a nelze ji změnit.');
      return;
    }

    if (isMuted) {
      playInAppMessageSound();
      setBlockedInfo(`Nemůžeš psát. Jsi umlčený ještě na ${muteTimeLeft}.`);
      return;
    }

    setBlockedInfo('');
    setMessage(text);
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

    const sendButtonScale = useRef(new Animated.Value(1)).current;

  const playSendButtonFeedback = () => {
    Animated.sequence([
      Animated.timing(sendButtonScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(sendButtonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const sendMessage = () => {
    closeReactionPicker();

    const trimmedMessage = message.trim();

    if (isAvatarLocked) {
      playInAppMessageSound();
      setBlockedInfo('Ikonka je uzamčena adminem a nelze ji změnit.');
      return;
    }

    if (isMuted) {
      playInAppMessageSound();
      setBlockedInfo(`Nemůžeš psát. Jsi umlčený ještě na ${muteTimeLeft}.`);
      return;
    }

    if (!trimmedMessage) {
      return;
    }

    if (trimmedMessage.startsWith(ANNOUNCEMENT_PREFIX)) {
      setBlockedInfo('Tento text nelze odeslat jako oznámení.');
      playInAppMessageSound();
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmedMessage,
      createdAt: Date.now(),
    };

        playSendButtonFeedback();

    const nextMessages = [...messages, newMessage];
    saveMessages(nextMessages);

    if (socket.connected) {
      socket.emit('chat:send', {
        userId: currentUserId,
        sender: 'user',
        text: trimmedMessage,
      });
    }

    setMessage('');
    setBlockedInfo('');
  };

  const sendFootMessage = () => {
    closeReactionPicker();

    if (isAvatarLocked || isMuted) {
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: FOOT_MESSAGE,
      createdAt: Date.now(),
    };

    playSendButtonFeedback();
    saveMessages([...messages, newMessage]);

    if (socket.connected) {
      socket.emit('chat:send', {
        userId: currentUserId,
        sender: 'user',
        text: FOOT_MESSAGE,
      });
    }
  };

  const adjustRatingValue = (statKey, delta) => {
    if (statKey === 'charisma') {
      setRatingCharisma((current) => Math.max(1, Math.min(10, current + delta)));
    } else if (statKey === 'stesti') {
      setRatingStesti((current) => Math.max(1, Math.min(10, current + delta)));
    }
  };

  const submitRating = () => {
    if (socket.connected) {
      socket.emit('user:ratingUpdate', {
        userId: currentUserId,
        charisma: ratingCharisma,
        stesti: ratingStesti,
      });
    }

    setRatingModalVisible(false);
    setRatingUnlocked(false);
  };

  const sendWallMessage = () => {
    const trimmedText = wallDraft.trim();

    if (!trimmedText) {
      return;
    }

    const nextWallMessage = {
      text: trimmedText.slice(0, WALL_MESSAGE_MAX_LENGTH),
      author: currentUserName,
      createdAt: Date.now(),
    };

    globalThis.CUSIIK_WALL_MESSAGE = nextWallMessage;
    setWallMessage(nextWallMessage);
    setWallDraft('');

    if (socket.connected) {
      socket.emit('wall:post', {
        userId: currentUserId,
        author: currentUserName,
        text: nextWallMessage.text,
      });
    }
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

  const renderInAppToast = () => {
    if (!inAppToast) {
      return null;
    }

    return (
      <View style={styles.inAppToastWrap}>
        <View style={styles.inAppToast}>
          <View style={styles.inAppToastTextWrap}>
            <Text style={styles.inAppToastTitle}>{inAppToast.title}</Text>
            <Text style={styles.inAppToastBody}>{inAppToast.body}</Text>
          </View>

          <Pressable
            style={styles.inAppToastButton}
            onPress={() => {
              inAppToast.onReply?.();
            }}
          >
            <Text style={styles.inAppToastButtonText}>Odpovědět</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderTitleBar = (title) => {

    const handleTopBack = () => {
      closeReactionPicker();

      if (screenMode === 'chat') {
        setScreenMode('menu');
        return;
      }

      goToLogin();
    };

            const handleMinimize = () => {
      closeReactionPicker();

      if (screenMode === 'chat') {
        triggerHahaEgg();
        return;
      }

      goToLogin();
    };


       const handleClose = () => {
      closeReactionPicker();
        if (Platform.OS === 'android') {
          BackHandler.exitApp();
        }
    };

    return (

      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
            <Image source={LOGO_ICON} style={styles.titleLogoImage} resizeMode="contain" />


          <Text style={styles.titleText}>{title}</Text>

                    <View style={styles.titleStatusAnimWrap}>
            <StatusAnimation status={effectiveAdminStatus} size={22} />
          </View>

          <Text style={styles.titleStatusText}>
            {getAdminStatusLabel()}
          </Text>

 
        </View>

               <View style={styles.windowButtons}>
               <View style={styles.windowButton}>
            <Pressable
              style={styles.closePressable}
              onPress={handleTopBack}
            >
              <Image source={BACK_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
            </Pressable>
          </View>

          {screenMode !== 'chat' ? (
            <View style={styles.windowButton}>
              <Pressable
                style={styles.closePressable}
                onPress={() => {
                  closeReactionPicker();
                  setHelpModalVisible(true);
                }}
              >
                <Image source={HELP_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.windowButton, styles.windowButtonGapLeft]}>
            <Pressable
              style={styles.closePressable}
              onPress={handleMinimize}
            >
              <Image source={MINIMIZE_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
            </Pressable>
          </View>


                    <View style={[styles.windowButton, styles.closeButton]}>
            <Pressable style={styles.closePressable} onPress={handleClose}>
              <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
            </Pressable>
          </View>


        </View>
      </View>
    );
  };

  const renderHelpModal = () => (
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

            <Pressable
              style={styles.modalCloseButtonPlain}
              onPress={() => setHelpModalVisible(false)}
            >
              <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
            </Pressable>
          </View>

                  <ScrollView style={styles.modalBody}>
            <Text style={styles.modalLabel}>Tlačítka vpravo nahoře</Text>
            <Text style={styles.helperBubbleText}>
              ← návrat (z chatu do menu, z menu odhlášení). ? tato nápověda. _ a X v chatu spustí vtípek, v menu odhlásí.
            </Text>

            <View style={{ height: 12 }} />

            <Text style={styles.modalLabel}>Chat s GM</Text>
            <Text style={styles.helperBubbleText}>
              Podržením zprávy v chatu na ni můžeš přidat rychlou reakci (smajlík).
            </Text>

            <View style={{ height: 12 }} />

            <Text style={styles.modalLabel}>Status GM</Text>
            <Text style={styles.helperBubbleText}>
              ON = GM je online a může reagovat. JOB = je zaneprázdněný. OFF = není dostupný.
            </Text>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );

  const renderRatingModal = () => (
    <Modal
      visible={ratingModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalWindow}>
          <View style={styles.modalTitleBar}>
            <Text style={styles.modalTitleText}>Hodnocení od GM</Text>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>
              GM ti odemkl hodnocení. Ohodnoť se prosím upřímně:
            </Text>

            <View style={styles.ratingEditRow}>
              <Text style={styles.ratingLabelText}>Charisma</Text>

              <View style={styles.ratingStepperRow}>
                <Pressable
                  style={({ pressed }) => [styles.ratingStepperButton, pressed && styles.sendButtonPressed]}
                  onPress={() => adjustRatingValue('charisma', -1)}
                >
                  <Text style={styles.ratingStepperButtonText}>-</Text>
                </Pressable>

                <Text style={styles.ratingStepperValue}>{ratingCharisma}/10</Text>

                <Pressable
                  style={({ pressed }) => [styles.ratingStepperButton, pressed && styles.sendButtonPressed]}
                  onPress={() => adjustRatingValue('charisma', 1)}
                >
                  <Text style={styles.ratingStepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.ratingEditRow}>
              <Text style={styles.ratingLabelText}>Štěstí</Text>

              <View style={styles.ratingStepperRow}>
                <Pressable
                  style={({ pressed }) => [styles.ratingStepperButton, pressed && styles.sendButtonPressed]}
                  onPress={() => adjustRatingValue('stesti', -1)}
                >
                  <Text style={styles.ratingStepperButtonText}>-</Text>
                </Pressable>

                <Text style={styles.ratingStepperValue}>{ratingStesti}/10</Text>

                <Pressable
                  style={({ pressed }) => [styles.ratingStepperButton, pressed && styles.sendButtonPressed]}
                  onPress={() => adjustRatingValue('stesti', 1)}
                >
                  <Text style={styles.ratingStepperButtonText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalButton, pressed && styles.sendButtonPressed]}
                onPress={submitRating}
              >
                <Text style={styles.modalButtonText}>Odeslat</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (screenMode === 'menu') {

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

                <View style={styles.page}>
          <Animated.View
            style={[
              styles.window,
              { transform: [{ translateX: screenSlideAnim }], opacity: screenFadeAnim },
            ]}
          >
            {renderTitleBar('Menu')}

            {announcement ? (
              <View style={styles.announcementBanner}>
                <Text style={styles.announcementBannerText}>{announcement.text}</Text>
                <View style={styles.announcementMetaRight}>
                  <Text style={styles.announcementCountdownText}>({formatAnnouncementCountdown(announcement.expiresAt)})</Text>
                  <Pressable
                    style={styles.announcementCloseButton}
                    onPress={() => {
                      dismissedAnnouncementIdRef.current = announcement.id;
                      setAnnouncement(null);
                    }}
                  >
                    <Image source={EXIT_ICON} style={styles.announcementCloseIcon} resizeMode="contain" />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {taskLockNotice ? (
              <View style={styles.taskLockBanner}>
                <Text style={styles.taskLockBannerText}>{taskLockNotice}</Text>
              </View>
            ) : null}

            <View style={styles.menuBody}>
              <View style={styles.adminMainMessageBox}>
                <Text style={styles.adminMainMessageText}>
                  Sleduj status - tím zjistíš jestli ti aktuálně mohu pomoct (status je vidět nahoře v liště)
                </Text>
              </View>

            <View style={styles.menuGrayPanel}>
              <Pressable
                style={[
                  styles.grayPanelUserIconBox,
                  {
                    backgroundColor: userBgColour,
                    borderTopColor: userIconColour,
                    borderLeftColor: userIconColour,
                    borderRightColor: userIconColour,
                    borderBottomColor: userIconColour,
                  },
                ]}
                onPress={() => {
                  if (isAvatarLocked) {
                    setBlockedInfo('Ikonka je uzamčena adminem a nelze ji změnit.');
                    return;
                  }

                  setIconModalVisible(true);
                }}
              >
                <Image
                  source={getIconSource(userAvatarIcon)}
                  style={styles.grayPanelUserIconImage}
                  resizeMode="contain"
                />
              </Pressable>

              <Text style={styles.grayPanelUserNameFlex}>{currentUserName}</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.grayPanelSettingsButton,
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
                <Text style={styles.grayPanelSettingsButtonText}>Nastavení</Text>
              </Pressable>
            </View>

            <View style={styles.menuMiddleSection}>
              <View style={styles.wallBox}>
                <Text style={styles.wallBoxTitle}>Minigame</Text>
                <Text style={styles.minigameSubtitle}>old school - pixelové</Text>
                <Text style={styles.topScoreTitle}>TOP SCORE</Text>

                <View style={styles.topScoreList}>
                  {TOP_SCORE_ROWS.map((name, index) => (
                    <View key={`${name}-${index}`} style={styles.topScoreRow}>
                      <Text style={styles.topScoreRank}>{`${index + 1}.`}</Text>
                      <Text style={styles.topScoreName}>{name}</Text>
                      <Text style={styles.topScoreValue}>{String(1000 - index * 73).padStart(4, '0')}</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.minigamePlayButton, pressed && styles.sendButtonPressed]}
                  onPress={() => Alert.alert('Minigame', 'Hra bude brzy spuštěna.')}
                >
                  <Text style={styles.minigamePlayButtonText}>HRÁT</Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.menuMiddleRatingBox}
                onPress={() => ratingUnlocked && setRatingModalVisible(true)}
                disabled={!ratingUnlocked}
              >
                <Text style={styles.ratingBoxTitle}>
                  {ratingUnlocked ? 'Hodnocení (odemčeno)' : 'Hodnocení (zamčeno)'}
                </Text>

                {RATING_STATS.map((stat) => (
                  <RatingSlider key={stat.key} label={stat.label} value={stat.value} locked={!ratingUnlocked} />
                ))}

                <View style={ratingUnlocked ? styles.ratingSubmitButton : styles.ratingSubmitDisabledButton}>
                  <Text style={styles.ratingSubmitDisabledIcon}>{ratingUnlocked ? '✎' : '🔒'}</Text>
                  <Text style={styles.ratingSubmitDisabledText}>{ratingUnlocked ? 'Vyplnit a odeslat' : 'Odeslat'}</Text>
                </View>
              </Pressable>
            </View>

            <ChatButtonPulseWrapper active={isAdminOnline} style={styles.chatButtonRight}>
              <Pressable
                disabled={isAvatarLocked}
                style={({ pressed }) => [
                  styles.grayPanelChatButton,
                  styles.grayPanelChatButtonOutlined,
                  effectiveAdminStatus === 'on' && styles.grayPanelChatButtonOnline,
                  effectiveAdminStatus === 'job' && styles.grayPanelChatButtonJob,
                  effectiveAdminStatus === 'off' && styles.grayPanelChatButtonOff,
                  isAvatarLocked && styles.grayPanelChatButtonDisabled,
                  pressed && !isAvatarLocked && styles.sendButtonPressed,
                ]}
                onPress={effectiveAdminStatus === 'on' ? openChat : openTomobloxInfo}
              >
                <AvatarIcon
                  source={getIconSource(adminProfile?.icon || 'admin')}
                  iconKey={normalizeAdminIcon(adminProfile?.icon || 'admin')}
                  style={styles.chatGmIcon}
                />
                <View style={styles.chatGmTextBox}>
                  <Text style={styles.grayPanelChatButtonText}>
                    {effectiveAdminStatus === 'on' ? 'Chatuj s GM' : 'Zanech info pro GM'}
                  </Text>
                  <Text style={styles.chatGmNameText}>Game master</Text>
                  <Text style={styles.chatGmStatusText}>
                    {effectiveAdminStatus === 'job' ? '(GM je zaneprázdněný - doba odpovědi je neurčitá)' : getAdminStatusText()}
                  </Text>
                </View>
                {unreadCount > 0 ? (
                  <View style={styles.chatNewMessageBadge}>
                    <Text style={styles.chatNewMessageBadgeText}>{getUnreadMessageLabel(unreadCount)}</Text>
                  </View>
                ) : null}
              </Pressable>
            </ChatButtonPulseWrapper>
            </View>

            <View style={styles.statusBar}>
              <Text style={styles.statusText}>Připojeno jako uživatel</Text>
              <Text style={styles.statusText}>
                {`${connectionText} | GM: ${getAdminStatusText()}`}
              </Text>
            </View>
          </Animated.View>

          <Modal
            visible={tomobloxModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setTomobloxModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalWindow}>
                <View style={styles.modalTitleBar}>
                  <Text style={styles.modalTitleText}>Info pro GM</Text>
                  <Pressable
                    style={styles.modalCloseButtonPlain}
                    onPress={() => setTomobloxModalVisible(false)}
                  >
                    <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                  </Pressable>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Vyplň alespoň jednu hodnotu:</Text>
                  <TextInput
                    value={tomobloxBoxes}
                    onChangeText={setTomobloxBoxes}
                    style={styles.modalInput}
                    placeholder="TomoBlox beden"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                  />
                  <TextInput
                    value={tomobloxCoins}
                    onChangeText={setTomobloxCoins}
                    style={styles.modalInput}
                    placeholder="TomoBlox Coins"
                    placeholderTextColor="#666666"
                    keyboardType="numeric"
                  />
                  {tomobloxError ? <Text style={styles.errorText}>{tomobloxError}</Text> : null}
                  <View style={styles.modalButtons}>
                    <Pressable style={styles.modalButton} onPress={submitTomobloxInfo}>
                      <Text style={styles.modalButtonText}>OK</Text>
                    </Pressable>
                    <Pressable style={styles.modalButton} onPress={() => setTomobloxModalVisible(false)}>
                      <Text style={styles.modalButtonText}>Zrušit</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

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
                    style={styles.modalCloseButtonPlain}
                    onPress={() => setIconModalVisible(false)}
                  >
                    <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
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
                        <Text style={styles.colourButtonText}>{`  ${iconItem.label}`}</Text>
                      </Pressable>
                    ))}
                  </View>

                </View>
                         </View>
                       </View>
          </Modal>

          {renderHelpModal()}
          {renderRatingModal()}
        </View>
      </SafeAreaView>
    );
  }
  return (

    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

              <KeyboardWrapper
        style={styles.page}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
              enabled
      >

        <Animated.View
          style={[
            styles.window,
            { transform: [{ translateX: screenSlideAnim }], opacity: screenFadeAnim },
          ]}
        >
                    {renderTitleBar('Chat s GM')}

          {announcement ? (
            <View style={styles.announcementBanner}>
              <Text style={styles.announcementBannerText}>{announcement.text}</Text>
              <Pressable
                style={styles.announcementCloseButton}
                onPress={() => {
                  dismissedAnnouncementIdRef.current = announcement.id;
                  setAnnouncement(null);
                }}
              >
                <Image source={EXIT_ICON} style={styles.announcementCloseIcon} resizeMode="contain" />
              </Pressable>
            </View>
          ) : null}

          {renderInAppToast()}

          {isMuted ? (
            <View style={styles.muteBanner}>
              <Text style={styles.muteBannerText}>
                Jsi umlčen. Psát můžeš znovu za {muteTimeLeft}.
              </Text>
            </View>
          ) : null}

                    <View style={styles.chatArea}>
            <TouchableWithoutFeedback onPress={closeReactionPicker}>
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
                  // Systémové hlášky (umlčení apod.) vidí jen admin, uživatel je v chatu nevidí vůbec.
                  return null;
                }



                              const myOutlineColour = userIconColour || '#0b3d91';
                const myBgColour = userBgColour || '#ece9d8';
                const adminOutlineColour = adminProfile?.silhouetteColour || '#0b3d91';
                const adminBgColour = adminProfile?.bgColour || '#ece9d8';
                const iconOutlineColour = isUser ? myOutlineColour : adminOutlineColour;
                const iconBgColour = isUser ? myBgColour : adminBgColour;
                const messageReactions = getMessageReactions(item);
                const userReaction = getReactionByKey(messageReactions.user);
                const adminReaction = getReactionByKey(messageReactions.admin);
                const isPickerOpenForThis = reactingMessageId === item.id;

                           return (
                  <AnimatedMessageRow
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isUser ? styles.messageRowUser : styles.messageRowAdmin,
                    ]}
                  >
                               <Pressable
                      style={[styles.miniIconWrapper, { borderColor: iconOutlineColour, backgroundColor: iconBgColour, borderWidth: 2 }]}
                      onPress={closeReactionPicker}
                    >
                      <AvatarIcon
                        source={getIconSource(isUser ? (userAvatarIcon || 'uzivatel') : (adminProfile?.icon || 'admin'))}
                        iconKey={isUser ? (userAvatarIcon || 'uzivatel') : (adminProfile?.icon || 'admin')}
                        style={styles.miniIconImage}
                      />
                    </Pressable>


                    <View style={styles.messageBubbleColumn}>
                                            <Pressable
                        onPress={closeReactionPicker}
                        onLongPress={() => toggleReactionPicker(item.id)}
                        delayLongPress={280}
                        style={[
                          styles.messageBubble,

                          isUser ? styles.userBubble : styles.adminBubble,
                        ]}
                      >
                        {userReaction || adminReaction ? (
                          <View pointerEvents="none" style={styles.reactionColourLayer}>
                            {userReaction && adminReaction ? (
                              <>
                                <View style={[styles.reactionColourHalf, { backgroundColor: hexToRgba(userReaction.colour, 0.24) }]} />
                                <View style={[styles.reactionColourHalf, { backgroundColor: hexToRgba(adminReaction.colour, 0.24) }]} />
                              </>
                            ) : (
                              <View
                                style={[
                                  styles.reactionColourFill,
                                  { backgroundColor: hexToRgba((userReaction || adminReaction).colour, 0.24) },
                                ]}
                              />
                            )}
                          </View>
                        ) : null}

                        <View style={styles.messageContent}>
                        <View style={styles.messageAuthorRow}>
                          <Text style={styles.messageAuthor}>
                            {isUser ? 'Já' : 'GM'}
                          </Text>

                          <Text style={styles.messageTime}>{messageTime}</Text>
                        </View>

                        {item.text === FOOT_MESSAGE ? (
                          <Image source={FOOT_ICON} style={styles.footMessageImage} resizeMode="contain" />
                        ) : (
                          <Text style={styles.messageText}>{item.text}</Text>
                        )}
                        </View>

                        {userReaction || adminReaction ? (
                          <View style={styles.messageReactionBadges}>
                            {userReaction ? (
                              <View style={[styles.messageReactionBadge, { backgroundColor: userReaction.colour }]}>
                                <Text style={styles.messageReactionBadgeText}>{userReaction.emoji}</Text>
                              </View>
                            ) : null}
                            {adminReaction ? (
                              <View style={[styles.messageReactionBadge, { backgroundColor: adminReaction.colour }]}>
                                <Text style={styles.messageReactionBadgeText}>{adminReaction.emoji}</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}
                      </Pressable>

                      {isPickerOpenForThis ? (
                        <View
                          style={[
                            styles.reactionPickerRow,
                            isUser ? styles.reactionPickerRowUser : styles.reactionPickerRowAdmin,
                          ]}
                          onLayout={() => {
                            if (shouldScrollToReactionPickerRef.current) {
                              shouldScrollToReactionPickerRef.current = false;
                              requestAnimationFrame(() => {
                                scrollViewRef.current?.scrollToEnd({ animated: true });
                              });
                            }
                          }}
                        >
                          {MESSAGE_REACTIONS.map((reactionItem) => (
                            <Pressable
                              key={reactionItem.key}
                              style={({ pressed }) => [
                                styles.reactionPickerButton,
                                { borderColor: reactionItem.colour },
                                pressed && styles.sendButtonPressed,
                              ]}
                              onPress={() => setMessageReaction(item.id, reactionItem.key)}
                            >
                              <Text style={styles.reactionPickerEmoji}>{reactionItem.emoji}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  </AnimatedMessageRow>
                );

              })}

                </ScrollView>
            </TouchableWithoutFeedback>

            {helperMenuVisible ? (
              <View style={styles.helperMenuBubble}>
                <Text style={styles.helperBubbleLabel}>Pomocné věty</Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.helperMenuOption,
                    pressed && styles.helperBubblePressed,
                  ]}
                  onPress={() => insertHelperMessage(HELPER_MESSAGE_GM)}
                >
                  <Text style={styles.helperBubbleText}>{HELPER_MESSAGE_GM}</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.helperInfoButton,
                helperMenuVisible && styles.helperInfoButtonActive,
                pressed && styles.helperBubblePressed,
              ]}
              onPress={() => {
                closeReactionPicker();
                setHelperMenuVisible((current) => !current);
              }}
            >
              <Text style={styles.helperInfoButtonText}>i</Text>
            </Pressable>
          </View>

          {blockedInfo ? (

            <View style={styles.blockedInfoBox}>
              <Text style={styles.blockedInfoText}>{blockedInfo}</Text>
            </View>
          ) : null}

          {(
          <View style={styles.inputPanel}>
                               <TextInput
              value={message}
              onFocus={() => {
                closeReactionPicker();
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
              }}
              onChangeText={(value) => {
                setBlockedInfo('');
                setMessage(value);
              }}
              placeholder={

                isMuted
                  ? `Umlčeno ještě na ${muteTimeLeft}`
                  : 'Napiš zprávu GM...'
              }

              placeholderTextColor="#666666"
              style={[styles.input, isMuted && styles.inputDisabled]}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              editable={!isMuted}
            />

                        <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
                          {message.trim() ? (
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
                          ) : (
                            <Pressable
                              accessibilityLabel="Poslat obrázek nohy"
                              style={({ pressed }) => [
                                styles.sendButton,
                                isMuted && styles.sendButtonDisabled,
                                pressed && !isMuted && styles.sendButtonPressed,
                              ]}
                              onPress={sendFootMessage}
                              disabled={isMuted}
                            >
                              <Image source={FOOT_ICON} style={styles.footButtonImage} resizeMode="contain" />
                            </Pressable>
                          )}
                        </Animated.View>

          </View>
          )}

          <View style={styles.statusBar}>
            <Pressable onPress={() => setScreenMode('menu')}>
              <Text style={styles.statusText}>Zpět do menu</Text>
            </Pressable>
            <Text style={styles.statusText}>
              {isMuted
                ? `Umlčeno: ${muteTimeLeft}`
                : `GM: ${getAdminStatusText()}`}
                      </Text>

          </View>
        </Animated.View>
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

      {renderHelpModal()}
      {renderRatingModal()}
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

  announcementBanner: {
    minHeight: 48,
    backgroundColor: '#fff8cc',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#7a4a00',
    borderBottomColor: '#7a4a00',
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 12,
    paddingRight: 46,
    paddingVertical: 9,
    justifyContent: 'center',
  },

  announcementBannerText: {
    color: '#3d2700',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },

  taskLockBanner: {
    backgroundColor: '#ffd7d7',
    borderWidth: 1,
    borderColor: '#a80000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },

  taskLockBannerText: {
    color: '#a80000',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  announcementMetaRight: {
    position: 'absolute',
    right: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  announcementCountdownText: {
    color: '#3d2700',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 8,
  },

  // stejny krizek jako vpravo nahore v liste (windowButton + windowButtonIcon)
  announcementCloseButton: {
    width: 22,
    height: 22,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  announcementCloseIcon: {
    width: 25,
    height: 25,
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


  titleStatusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginLeft: 8,
  },

  titleStatusAnimWrap: {
    width: 22,
    height: 22,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

    titleStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
  },

   windowButtonGapLeft: {
    marginLeft: 16,
  },


  closeButton: {
    marginLeft: 4,
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

  windowButtonIcon: {
    width: 25,
    height: 25,
  },

  modalCloseButtonPlain: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },


  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 19,
  },

  menuBody: {
    flex: 1,
    padding: 14,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

  menuTopSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
  },

  menuAdminIconBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  menuAdminIconImage: {
    width: 30,
    height: 30,
  },

  menuTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  menuTopBubbleImage: {
    width: 34,
    height: 34,
    marginRight: 8,
  },

  menuAdminIconColumn: {
    alignItems: 'center',
  },

  menuAdminGmLabel: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },

  menuAdminGmStatus: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 1,
  },

  menuGrayPanel: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d6d3c3',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },

  grayPanelUserIconBox: {
    width: 40,
    height: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#f5f5f5',
  },

  grayPanelUserIconImage: {
    width: 24,
    height: 24,
  },

  grayPanelUserName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },

  grayPanelUserNameFlex: {
    flex: 1,
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },

  grayPanelSettingsButton: {
    height: 34,
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

  grayPanelSettingsButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },

  grayPanelChatButton: {
    height: 34,
    minWidth: 84,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },

  grayPanelChatButtonOutlined: {
    width: '100%',
    height: 54,
    marginBottom: 10,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  chatButtonRight: {
    alignSelf: 'flex-end',
    width: '94%',
  },

  grayPanelChatButtonOnline: {
    borderColor: '#2f9e44',
    backgroundColor: '#d7ffd8',
  },

  grayPanelChatButtonJob: {
    borderColor: '#c87800',
    backgroundColor: '#fff0c2',
  },

  grayPanelChatButtonOff: {
    borderColor: '#b42323',
    backgroundColor: '#ffd6d6',
  },

  grayPanelChatButtonDisabled: {
    backgroundColor: '#d6d3c3',
    opacity: 0.7,
  },

  grayPanelChatButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  chatGmIcon: {
    width: 34,
    height: 34,
    marginRight: 10,
  },

  chatGmTextBox: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  chatGmNameText: {
    color: '#444444',
    fontSize: 11,
    fontWeight: '800',
  },

  chatGmStatusText: {
    color: '#0058d8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  chatNewMessageBadge: {
    minHeight: 28,
    paddingHorizontal: 8,
    backgroundColor: '#ffcc00',
    borderWidth: 2,
    borderTopColor: '#fff3a3',
    borderLeftColor: '#fff3a3',
    borderRightColor: '#8a6d00',
    borderBottomColor: '#8a6d00',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chatNewMessageBadgeText: {
    color: '#3b2b00',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },

  capabilitiesSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 10,
  },

  capabilitiesTitle: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 5,
  },

  capabilityText: {
    color: '#222222',
    fontSize: 13,
    fontWeight: '700',
  },

  menuMiddleSection: {
    width: '100%',
    flexDirection: 'row',
    flex: 1,
    minHeight: 320,
    marginTop: 8,
    marginBottom: 12,
  },

  menuMiddleLeftBox: {
    flex: 1,
    marginRight: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#aaa793',
    backgroundColor: '#f5f5f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },

  terminalBox: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#0a0f0a',
    borderWidth: 2,
    borderTopColor: '#1c2e1c',
    borderLeftColor: '#1c2e1c',
    borderRightColor: '#00ff66',
    borderBottomColor: '#00ff66',
    padding: 10,
    overflow: 'hidden',
    position: 'relative',
  },

  terminalScanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
  },

  terminalLine: {
    color: '#00ff66',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },

  terminalPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  terminalPrompt: {
    color: '#00ff66',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },

  terminalCursor: {
    color: '#00ff66',
    fontSize: 12,
    fontWeight: '900',
  },

  wallBox: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#fffdf5',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#c9a227',
    borderBottomColor: '#c9a227',
    padding: 10,
    justifyContent: 'space-between',
  },

  wallBoxTitle: {
    color: '#5c3300',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  minigameSubtitle: {
    color: '#7a4b00',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'lowercase',
    marginBottom: 6,
  },

  topScoreTitle: {
    color: '#d23b00',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },

  topScoreList: {
    borderWidth: 2,
    borderTopColor: '#fff8d6',
    borderLeftColor: '#fff8d6',
    borderRightColor: '#8d6d38',
    borderBottomColor: '#8d6d38',
    backgroundColor: '#fff3c4',
    padding: 6,
  },

  topScoreRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d8bd74',
  },

  topScoreRank: {
    width: 30,
    color: '#7a4b00',
    fontSize: 12,
    fontWeight: '900',
  },

  topScoreName: {
    flex: 1,
    color: '#3e2a08',
    fontSize: 12,
    fontWeight: '800',
  },

  topScoreValue: {
    color: '#d23b00',
    fontSize: 12,
    fontWeight: '900',
  },

  minigamePlayButton: {
    marginTop: 10,
    minHeight: 54,
    backgroundColor: '#d23b00',
    borderWidth: 3,
    borderTopColor: '#ffb36b',
    borderLeftColor: '#ffb36b',
    borderRightColor: '#7a1f00',
    borderBottomColor: '#7a1f00',
    alignItems: 'center',
    justifyContent: 'center',
  },

  minigamePlayButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  wallMessagePreview: {
    minHeight: 44,
    backgroundColor: '#fff8e0',
    borderWidth: 1,
    borderColor: '#e0c680',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    marginBottom: 8,
  },

  wallMessageText: {
    color: '#3a2a00',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  wallMessageAuthor: {
    color: '#8a6a1f',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'right',
  },

  wallEmptyText: {
    color: '#9a8a5f',
    fontSize: 11,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  wallInputWrap: {
    marginTop: 'auto',
  },

  wallInput: {
    minHeight: 54,
    maxHeight: 70,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 2,
    borderTopColor: '#6e6e6e',
    borderLeftColor: '#6e6e6e',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    textAlignVertical: 'top',
  },

  wallInputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  wallCharCount: {
    color: '#8a8a8a',
    fontSize: 10,
    fontWeight: '700',
  },

  wallSendButton: {
    height: 30,
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

  wallSendButtonText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },

  menuMiddleRatingBox: {
    flex: 1,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 10,
  },

  ratingBoxTitle: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  ratingRow: {
    marginBottom: 12,
  },

  ratingLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  ratingLabelText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },

  ratingValueText: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '700',
  },

  ratingTrackWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ratingEndLabel: {
    color: '#555555',
    fontSize: 9,
    fontWeight: '900',
    width: 14,
    textAlign: 'center',
  },

  ratingTrack: {
    flex: 1,
    height: 18,
    marginHorizontal: 4,
    justifyContent: 'center',
    position: 'relative',
  },

  ratingTrackFill: {
    height: 3,
    backgroundColor: '#b7b39c',
    borderRadius: 2,
  },

  ratingTrackDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    marginLeft: -9,
    top: -7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingLockIcon: {
    fontSize: 9,
  },

  ratingSubmitDisabledButton: {
    marginTop: 6,
    height: 36,
    backgroundColor: '#d6d3c3',
    borderWidth: 2,
    borderTopColor: '#bebaa4',
    borderLeftColor: '#bebaa4',
    borderRightColor: '#8a8a8a',
    borderBottomColor: '#8a8a8a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },

  ratingSubmitButton: {
    marginTop: 6,
    height: 36,
    backgroundColor: '#d7ffd8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#4f8f54',
    borderBottomColor: '#4f8f54',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingSubmitDisabledIcon: {
    fontSize: 12,
    marginRight: 6,
  },

  ratingSubmitDisabledText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '900',
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
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 8,
  },

  messagesScroll: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 26,
  },

  messageRow: {
    width: '100%',
    marginBottom: 12,
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

   messageBubbleColumn: {
    maxWidth: '82%',
  },

  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingBottom: 16,
    borderWidth: 2,
    position: 'relative',
  },

  reactionColourLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },

  reactionColourHalf: {
    flex: 1,
  },

  reactionColourFill: {
    flex: 1,
  },

  messageContent: {
    zIndex: 1,
  },

  messageReactionBadges: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    zIndex: 2,
    flexDirection: 'row',
  },

  messageReactionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },

  messageReactionBadgeText: {
    fontSize: 13,
  },

  reactionPickerRow: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  reactionPickerRowUser: {
    alignSelf: 'flex-end',
  },

  reactionPickerRowAdmin: {
    alignSelf: 'flex-start',
  },

  reactionPickerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },

  reactionPickerEmoji: {
    fontSize: 16,
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
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
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

  messageStatusAnimWrap: {
    width: 14,
    height: 14,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
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

  helperMenuBubble: {
    position: 'absolute',
    left: 10,
    bottom: 48,
    width: '86%',
    maxWidth: 360,
    backgroundColor: '#fff0a6',
    borderWidth: 2,
    borderColor: '#d97800',
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 3,
    elevation: 8,
    zIndex: 10,
  },

  helperMenuOption: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#d99a22',
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginBottom: 7,
  },

  helperInfoButton: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffd34d',
    borderWidth: 2,
    borderColor: '#d97800',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 9,
    zIndex: 11,
  },

  helperInfoButtonActive: {
    backgroundColor: '#ffb52e',
  },

  helperInfoButtonText: {
    color: '#5c3300',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
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
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
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

  footButtonImage: {
    width: 32,
    height: 32,
  },

  footMessageImage: {
    width: 96,
    height: 72,
  },

  statusBar: {
    height: 28,
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
    overflow: 'hidden',
  },

  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 19,
  },

  modalCloseButtonIcon: {
    width: 18,
    height: 18,
    tintColor: '#ffffff',
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
    backgroundColor: '#f4f1e8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#8a8a8a',
    borderBottomColor: '#8a8a8a',
    marginBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconButtonSelected: {
    borderTopColor: '#1b5ec7',
    borderLeftColor: '#1b5ec7',
    borderRightColor: '#8ab3ff',
    borderBottomColor: '#8ab3ff',
    backgroundColor: '#f2f7ff',
  },

  iconPreview: {
    width: 26,
    height: 26,
    marginRight: 4,
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

  ratingEditRow: {
    marginBottom: 14,
  },

  ratingStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  ratingStepperButton: {
    width: 40,
    height: 40,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingStepperButtonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
  },

  ratingStepperValue: {
    color: '#003c9e',
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 16,
    minWidth: 50,
    textAlign: 'center',
  },
});

