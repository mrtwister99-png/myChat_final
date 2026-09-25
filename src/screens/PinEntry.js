import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View, Keyboard, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socket } from '../socket';
import { getOrCreateDeviceId } from '../deviceId';
import { StatusAnimation } from '../components/StatusAnimations';
import { playInAppMessageSound, playXpStartSound } from '../utils/inAppSound';

const ADMIN_SETUP_QUESTION = 'OTÁZKA? (MÁŠ 1 POKUS !)';
const USER_SCREEN = 'UzivatelPin';
const ADMIN_SCREEN = 'AdminPin';
const MAX_PIN_ATTEMPTS = 5;
const PIN_BLOCK_MS = 15 * 60 * 1000;
const MINIMIZE_ICON = require('../assets/icons/minimalize.png');
const MAXIMIZE_ICON = require('../assets/icons/maximalize.png');
const EXIT_ICON = require('../assets/icons/exit.png');
const LOGO_ICON = require('../assets/icons/logoxp.png');

const LOCAL_RANDOM_USER_NAMES = [
  'Jiří', 'Jan', 'Petr', 'Josef', 'Pavel', 'Martin', 'Tomáš', 'Jaroslav', 'Miroslav', 'Zdeněk',
  'Václav', 'Michal', 'František', 'Jakub', 'Milan', 'Karel', 'Lukáš', 'David', 'Vladimír', 'Ondřej',
  'Ladislav', 'Roman', 'Marek', 'Stanislav', 'Daniel', 'Radek', 'Antonín', 'Vojtěch', 'Filip', 'Adam',
  'Matěj', 'Dominik', 'Aleš', 'Miloslav', 'Jaromír', 'Patrik', 'Libor', 'Jindřich', 'Vlastimil', 'Miloš',
  'Lubomír', 'Štěpán', 'Oldřich', 'Rudolf', 'Matyáš', 'Ivan', 'Robert', 'Luboš', 'Radim', 'Richard',
  'Vít', 'Bohumil', 'Šimon', 'Rostislav', 'Ivo', 'Luděk', 'Dušan', 'Kamil', 'Michael', 'Vladislav',
  'Zbyněk', 'Viktor', 'Bohuslav', 'Kryštof', 'Alois', 'René', 'Vítězslav', 'Tadeáš', 'Štefan', 'Eduard',
  'Marcel', 'Ján', 'Jozef', 'Samuel', 'Dalibor', 'Emil', 'Radomír', 'Ludvík', 'Denis', 'Vilém',
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

const EGG_IMAGES = [
  require('../assets/egg/egg1.png'),
  require('../assets/egg/egg2.png'),
  require('../assets/egg/egg3.png'),
  require('../assets/egg/egg4.png'),
  require('../assets/egg/egg5.png'),
  require('../assets/egg/egg6.png'),
  require('../assets/egg/egg7.png'),
  require('../assets/egg/egg8.png'),
  require('../assets/egg/egg9.png'),
  require('../assets/egg/egg10.png'),
];

const PinEntry = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [errorText, setErrorText] = useState('');
  const [serverStatusText, setServerStatusText] = useState('Připojuji server...');
  const [authWaiting, setAuthWaiting] = useState(false);
  const [waitingModalVisible, setWaitingModalVisible] = useState(false);
  const [approvedModalVisible, setApprovedModalVisible] = useState(false);
  const [rejectedModalVisible, setRejectedModalVisible] = useState(false);
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [adminSetupVisible, setAdminSetupVisible] = useState(false);
  const [adminSetupStep, setAdminSetupStep] = useState('question');
  const [adminSetupAnswer, setAdminSetupAnswer] = useState('');
  const [adminSetupPin, setAdminSetupPin] = useState('');
  const [adminSetupPinConfirm, setAdminSetupPinConfirm] = useState('');
  const [adminSetupPassword, setAdminSetupPassword] = useState('');
  const [adminSetupPasswordConfirm, setAdminSetupPasswordConfirm] = useState('');
  const [isSavingAdminSetup, setIsSavingAdminSetup] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinBlockedUntil, setPinBlockedUntil] = useState(0);
  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [recoveryWords, setRecoveryWords] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const pinAttemptsRef = useRef(0);
  const pinBlockedUntilRef = useRef(0);
  const pendingAuthRef = useRef(null);

  const openRecoveryModal = () => {
    setRecoveryModalVisible(true);
    setRecoveryMessage('');
  };

  const submitRecoveryRequest = () => {
    if (!recoveryWords.trim() || !recoveryEmail.trim() || !recoveryPassword) {
      setRecoveryMessage('Vyplň 2 slova, nový email a heslo k emailu.');
      return;
    }

    socket.emit('recovery:request', {
      userId: globalThis.CUSIIK_LAST_USER_ID || null,
      secretWords: recoveryWords.trim(),
      recoveryEmail: recoveryEmail.trim(),
      recoveryPassword,
      reason: 'Zapomenutý PIN',
    });
    setRecoveryMessage('Žádost byla odeslána adminovi.');
    setRecoveryModalVisible(false);
  };

  const getServerStatusType = (value) => {
    const normalized = String(value || '').toLowerCase();

    if (normalized.includes('online')) {
      return 'on';
    }

    if (normalized.includes('připojuj') || normalized.includes('ověřuji')) {
      return 'job';
    }

    if (normalized.includes('nedostup') || normalized.includes('offline')) {
      return 'off';
    }

    return 'off';
  };
    const inputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const entranceAnim = useRef(new Animated.Value(-Dimensions.get('window').width)).current;


  // Easter egg states
  const [easterActive, setEasterActive] = useState(false);
  const [easterIndex, setEasterIndex] = useState(0);
  const [easterTimer, setEasterTimer] = useState(10);
  const [easterPos, setEasterPos] = useState({ top: 100, left: 50 });
  const [easterScale, setEasterScale] = useState(1);
  const [easterFinished, setEasterFinished] = useState(false);
  const [easterFailed, setEasterFailed] = useState(false);
  const timerRef = useRef(null);
  const screenDim = Dimensions.get('window');

    useEffect(() => {
      let isActive = true;

      const ensureDeviceId = async () => {
        const storedDeviceId = await getOrCreateDeviceId();
        globalThis.CUSIIK_DEVICE_ID = storedDeviceId;

        if (isActive) {
          setDeviceId(storedDeviceId);
        }
      };

      ensureDeviceId().catch(() => {});

      return () => {
        isActive = false;
      };
    }, []);

    useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Animated.timing(entranceAnim, {
      toValue: 0,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);


  useEffect(() => {
    let isActive = true;

    const restoreLastUserIdentity = async () => {
      try {
        const [storedLastUserId, storedLastUserName] = await Promise.all([
          AsyncStorage.getItem('lastUserId'),
          AsyncStorage.getItem('lastUserName'),
        ]);

        if (!isActive) {
          return;
        }

        globalThis.CUSIIK_LAST_USER_ID = storedLastUserId || null;

        if (storedLastUserName) {
          globalThis.CUSIIK_CURRENT_USER_NAME = storedLastUserName;
        }

        if (socket.connected && storedLastUserId) {
          socket.emit('client:ready', {
            lastUserId: storedLastUserId,
            deviceId: globalThis.CUSIIK_DEVICE_ID || null,
          });
        }
      } catch (error) {
        globalThis.CUSIIK_LAST_USER_ID = globalThis.CUSIIK_LAST_USER_ID || null;
      }
    };

    restoreLastUserIdentity();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      setServerStatusText('Server online');
      const lastId = globalThis.CUSIIK_LAST_USER_ID;
      if (lastId || globalThis.CUSIIK_DEVICE_ID) {
        socket.emit('client:ready', {
          lastUserId: lastId || null,
          deviceId: globalThis.CUSIIK_DEVICE_ID || null,
        });
      }
    };
    const handleDisconnect = () => { setServerStatusText('Server offline - jede lokální režim'); setIsCheckingPin(false); };
    const handleConnectError = () => { setServerStatusText('Server nedostupný'); setIsCheckingPin(false); };

    const handleAuthSuccess = async (payload) => {
      setIsCheckingPin(false);
      setPin('');
      setErrorText('');
      pinAttemptsRef.current = 0;
      pinBlockedUntilRef.current = 0;
      setPinAttempts(0);
      setPinBlockedUntil(0);
      await savePinAttemptState(0, 0);
      // FIX: zapamatovat si PIN, kterym se prihlaseni opravdu povedlo.
      // Obrazovky ho pak pouziji pro re-auth po reconnectu socketu.
      const usedPin = String(pendingAuthRef.current?.pin || '').replace(/[^0-9]/g, '').slice(0, 5);

      if (payload?.role === 'user') {
        playXpStartSound();
        globalThis.CUSIIK_CURRENT_ROLE = 'user';
        globalThis.CUSIIK_CURRENT_USER_ID = payload.userId;
        globalThis.CUSIIK_CURRENT_USER_NAME = payload.userName;
        const pairsToSave = [
          ['lastUserId', payload.userId],
          ['lastUserName', payload.userName || ''],
        ];
        if (usedPin.length === 5) {
          globalThis.CUSIIK_USER_PIN = usedPin;
          pairsToSave.push(['userPin', usedPin]);
        }
        await AsyncStorage.multiSet(pairsToSave);
        globalThis.CUSIIK_LAST_USER_ID = payload.userId;
      }

      if (payload?.role === 'admin') {
        globalThis.CUSIIK_CURRENT_ROLE = 'admin';
        globalThis.CUSIIK_CURRENT_USER_ID = null;

        if (usedPin.length === 5) {
          globalThis.CUSIIK_ADMIN_PIN = usedPin;
          await AsyncStorage.setItem('adminPin', usedPin);
        }

        const adminSetupComplete = (await AsyncStorage.getItem('adminSetupComplete')) === 'true';
        if (!adminSetupComplete) {
          setAdminSetupVisible(true);
          setAdminSetupStep('question');
          setAdminSetupAnswer('');
          setAdminSetupPin('');
          setAdminSetupPinConfirm('');
          setAdminSetupPassword('');
          setAdminSetupPasswordConfirm('');
          return;
        }

        playXpStartSound();
      }

      if (globalThis.CUSIIK_EXPO_PUSH_TOKEN) {
        socket.emit('notifications:registerToken', {
          token: globalThis.CUSIIK_EXPO_PUSH_TOKEN,
          role: payload.role,
          userId: payload.userId || null,
          // FIX: bez deviceId server registraci zahodil (early return)
          deviceId: globalThis.CUSIIK_DEVICE_ID || deviceId || null,
        });
      }

      if (payload?.role === 'admin') { navigation.replace(ADMIN_SCREEN); return; }
      if (payload?.role === 'user') { navigation.replace(USER_SCREEN, { userId: payload.userId }); return; }
      handleWrongPin();
    };

    const handleAuthError = (payload) => {
      setIsCheckingPin(false);
      setAuthWaiting(false);

      if (payload?.code === 'PIN_BLOCKED' && payload?.blockedUntil) {
        const blockedUntil = Number(payload.blockedUntil);
        pinBlockedUntilRef.current = blockedUntil;
        setPinBlockedUntil(blockedUntil);
        savePinAttemptState(MAX_PIN_ATTEMPTS, blockedUntil);
      }

      if (payload?.code === 'PIN_BLOCKED') {
        setErrorText('Příliš mnoho chybných PINů.');
        openRecoveryModal();
        return;
      }

      handleWrongPin();
      if (pinAttemptsRef.current >= MAX_PIN_ATTEMPTS) openRecoveryModal();
    };
    const handleRecoveryMessage = ({ message } = {}) => {
      if (message) {
        setRecoveryMessage(String(message));
        setRecoveryModalVisible(true);
      }
    };
       const handleAuthWaiting = (payload) => {
      setIsCheckingPin(false);
      setAuthWaiting(true);
      setServerStatusText(payload?.message || 'Čekám na schválení adminem...');
      setWaitingModalVisible(true);
    };
    const handleDeviceApproved = ({ deviceId: approvedDeviceId } = {}) => {
      // uzivatel ceka na schvaleni - prijmeme i kdyz deviceId je effective (fingerprint/socket)
      if (!authWaiting &&!pendingAuthRef.current) {
        return;
      }

      pendingAuthRef.current = null;
      setAuthWaiting(false);
      setIsCheckingPin(false);
      setPin('');
      setServerStatusText('Schváleno GM - zadejte PIN do 5 minut');
      setWaitingModalVisible(false);
      setApprovedModalVisible(true);
    };
    const handleDeviceRejected = () => {
      pendingAuthRef.current = null;
      setAuthWaiting(false);
      setIsCheckingPin(false);
      setWaitingModalVisible(false);
      setErrorText('Zařízení bylo zamítnuto adminem.');
      setRejectedModalVisible(true);
    };
    const handleUserKicked = async ({ userId, preserveIdentity, specialPin } = {}) => {
      const shouldPreserveIdentity = Boolean(preserveIdentity && userId);

      if (shouldPreserveIdentity) {
        const cleanUserId = String(userId);
        globalThis.CUSIIK_LAST_USER_ID = cleanUserId;
        await AsyncStorage.setItem('lastUserId', cleanUserId);
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = specialPin || null;
      } else {
        await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
        globalThis.CUSIIK_LAST_USER_ID = null;
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = null;
      }

      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_NAME = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      navigation.replace('PinEntry');
    };

    const handleRoomKicked = async () => {
      await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
      globalThis.CUSIIK_LAST_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_NAME = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = null;
      navigation.replace('PinEntry');
    };

    const handleVerifySetupAnswer = (payload) => {
      if (payload?.ok) {
        setAdminSetupStep('pin');
        setErrorText('');
      } else {
        setErrorText('Špatná odpověď. Blokováno pro tento přístup.');
        setAdminSetupVisible(false);
        setAdminSetupAnswer('');
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('auth:success', handleAuthSuccess);
    socket.on('auth:error', handleAuthError);
    socket.on('auth:waiting', handleAuthWaiting);
    socket.on('device:approved', handleDeviceApproved);
    socket.on('device:rejected', handleDeviceRejected);
    socket.on('user:kicked', handleUserKicked);
    socket.on('room:kicked', handleRoomKicked);
    socket.on('admin:verifySetupAnswer:result', handleVerifySetupAnswer);
    socket.on('recovery:message', handleRecoveryMessage);

    if (socket.connected) setServerStatusText('Server online'); else socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('auth:success', handleAuthSuccess);
      socket.off('auth:error', handleAuthError);
      socket.off('auth:waiting', handleAuthWaiting);
      socket.off('device:approved', handleDeviceApproved);
      socket.off('device:rejected', handleDeviceRejected);
      socket.off('user:kicked', handleUserKicked);
      socket.off('room:kicked', handleRoomKicked);
      socket.off('admin:verifySetupAnswer:result', handleVerifySetupAnswer);
      socket.off('recovery:message', handleRecoveryMessage);
    };
  }, [navigation]);

  const refreshPinAttemptState = async () => {
    try {
      const [storedAttempts, storedBlockedUntil, setupDone] = await Promise.all([
        AsyncStorage.getItem('pinAttemptCount'),
        AsyncStorage.getItem('pinBlockedUntil'),
        AsyncStorage.getItem('adminSetupComplete'),
      ]);

      const nextAttempts = Number(storedAttempts || 0);
      const nextBlockedUntil = Number(storedBlockedUntil || 0);

      pinAttemptsRef.current = Number.isFinite(nextAttempts) ? nextAttempts : 0;
      pinBlockedUntilRef.current = Number.isFinite(nextBlockedUntil) ? nextBlockedUntil : 0;

      setPinAttempts(pinAttemptsRef.current);
      setPinBlockedUntil(pinBlockedUntilRef.current);
      if (pinAttemptsRef.current >= MAX_PIN_ATTEMPTS) {
        setRecoveryModalVisible(true);
      }
      globalThis.CUSIIK_ADMIN_SETUP_COMPLETE = setupDone === 'true';
    } catch {}
  };

  const isPinBlocked = () => {
    const blockedUntil = pinBlockedUntilRef.current || 0;
    return Date.now() < blockedUntil;
  };

  const savePinAttemptState = async (count, until) => {
    try {
      await AsyncStorage.multiSet([
        ['pinAttemptCount', String(count)],
        ['pinBlockedUntil', String(until || 0)],
      ]);
    } catch {}
  };

  const focusKeyboard = () => { 
    if (easterActive) return;
    inputRef.current?.blur(); 
    setTimeout(()=>inputRef.current?.focus(), 120); 
  };
  const resetAndFocus = () => { setPin(''); setIsCheckingPin(false); setTimeout(()=>inputRef.current?.focus(), 150); };

  const shakeWindow = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start(resetAndFocus);
  };

  const handleWrongPin = () => {
    const nextAttemptCount = pinAttemptsRef.current + 1;
    pinAttemptsRef.current = nextAttemptCount;
    setPinAttempts(nextAttemptCount);

    if (nextAttemptCount >= MAX_PIN_ATTEMPTS) {
      const blockUntil = Date.now() + PIN_BLOCK_MS;
      pinBlockedUntilRef.current = blockUntil;
      setPinBlockedUntil(blockUntil);
      savePinAttemptState(nextAttemptCount, blockUntil);
      setErrorText(`Příliš mnoho chyb. PIN je blokovaný na 15 minut.`);
    } else {
      savePinAttemptState(nextAttemptCount, pinBlockedUntilRef.current || 0);
      setErrorText(`Špatný PIN. Zbývá ${MAX_PIN_ATTEMPTS - nextAttemptCount} pokusů.`);
    }

    playInAppMessageSound();
    shakeWindow();
  };

    const handlePinChange = (value) => {
    if (isCheckingPin || authWaiting || easterActive || isPinBlocked()) {
      if (isPinBlocked()) {
        setErrorText('PIN je zablokovaný na 15 minut.');
      }
      return;
    }

    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 5);

    setPin(cleanValue);
    setErrorText('');

    if (cleanValue.length!== 5) {
      return;
    }

    setTimeout(() => {
      if (socket.connected) {
        setIsCheckingPin(true);
        setAuthWaiting(false);
        setServerStatusText('Ověřuji PIN přes server...');

        pendingAuthRef.current = {
          pin: cleanValue,
          lastUserId: globalThis.CUSIIK_LAST_USER_ID || null,
          deviceId: deviceId || null,
          deviceFingerprint: deviceId || null,
          deviceModel: [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Device.deviceName || 'Neznámé zařízení',
          chosenName: globalThis.CUSIIK_CURRENT_USER_NAME || 'Pavel',
        };
        socket.emit('auth:attempt', pendingAuthRef.current);
        // hned smazat cisla aby mohl psat znovu
        setPin('');

        return;
      }

      setIsCheckingPin(false);
      setErrorText('Server musí být online pro přihlášení.');
      playInAppMessageSound();
      shakeWindow();
      setPin('');
    }, 150);
  };

  const resetAdminSetup = () => {
    setAdminSetupVisible(false);
    setAdminSetupStep('question');
    setAdminSetupAnswer('');
    setAdminSetupPin('');
    setAdminSetupPinConfirm('');
    setAdminSetupPassword('');
    setAdminSetupPasswordConfirm('');
  };

  const handleAdminSetupAnswer = () => {
    if (!socket.connected) {
      setErrorText('Server musí být online pro ověření.');
      return;
    }
    socket.emit('admin:verifySetupAnswer', { answer: adminSetupAnswer.trim() });
  };

  const finalizeAdminSetup = async () => {
    if (isSavingAdminSetup) {
      return;
    }

    const cleanedNewPin = adminSetupPin.replace(/[^0-9]/g, '').slice(0, 5);
    const cleanedConfirmPin = adminSetupPinConfirm.replace(/[^0-9]/g, '').slice(0, 5);
    const cleanedPassword = adminSetupPassword.trim();
    const cleanedPasswordConfirm = adminSetupPasswordConfirm.trim();

    if (cleanedNewPin.length !== 5) {
      setErrorText('PIN musí mít přesně 5 číslic.');
      return;
    }

    if (cleanedNewPin !== cleanedConfirmPin) {
      setErrorText('PIN se neshoduje.');
      return;
    }

    if (cleanedPassword.length < 4) {
      setErrorText('Heslo pro obnovu musí mít alespoň 4 znaky.');
      return;
    }

    if (cleanedPassword !== cleanedPasswordConfirm) {
      setErrorText('Heslo pro obnovu se neshoduje.');
      return;
    }

    setIsSavingAdminSetup(true);

    globalThis.CUSIIK_ADMIN_PIN = cleanedNewPin;
    globalThis.CUSIIK_ADMIN_PW = cleanedPassword;
    globalThis.CUSIIK_ADMIN_SETUP_COMPLETE = true;

    try {
      await AsyncStorage.multiSet([
        ['adminSetupComplete', 'true'],
        ['adminPin', cleanedNewPin],
        ['adminPw', cleanedPassword],
      ]);

      if (socket.connected) {
        socket.emit('admin:setAdminPin', { pin: cleanedNewPin });
        socket.emit('admin:setAdminPw', { pw: cleanedPassword });
      }

      setAdminSetupVisible(false);
      setAdminSetupStep('question');
      setPin('');
      setErrorText('');
      setAdminSetupAnswer('');
      setAdminSetupPin('');
      setAdminSetupPinConfirm('');
      setAdminSetupPassword('');
      setAdminSetupPasswordConfirm('');
      navigation.replace(ADMIN_SCREEN);
      playXpStartSound();
    } catch (error) {
      setErrorText('Uložení se nepodařilo. Zkus to znovu.');
    } finally {
      setIsSavingAdminSetup(false);
    }
  };

  const handleAdminSetupSavePress = () => {
    Keyboard.dismiss();
    setErrorText('');
    void finalizeAdminSetup();
  };

  // Windows titleBar handlers
  const handleMinimize = () => {
    Keyboard.dismiss();
  };

  const handleCloseApp = () => {
    if (Platform.OS === 'android') {
      try {
        BackHandler.exitApp();
      } catch {}
    }
  };

  // Easter egg logic
  const generateRandomPosAndScale = () => {
    const maxTop = screenDim.height - 250;
    const maxLeft = screenDim.width - 220;
    const top = Math.floor(Math.random() * (maxTop - 80)) + 60;
    const left = Math.floor(Math.random() * (maxLeft - 20)) + 10;
    const scale = Math.random() * 0.7 + 0.6;
    setEasterPos({ top, left });
    setEasterScale(scale);
  };

  const startEasterEgg = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setEasterActive(true);
    setEasterFinished(false);
    setEasterFailed(false);
    setEasterIndex(0);
    setEasterTimer(10);
    generateRandomPosAndScale();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setEasterTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setEasterFailed(true);
          setEasterActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closeCurrentEgg = () => {
    const nextIndex = easterIndex + 1;
    if (nextIndex >= EGG_IMAGES.length) {
      // Finished all
      if (timerRef.current) clearInterval(timerRef.current);
      setEasterActive(false);
      setEasterFinished(true);
    } else {
      setEasterIndex(nextIndex);
      generateRandomPosAndScale();
    }
  };

  const closeEasterFinal = () => {
    setEasterFinished(false);
    setEasterFailed(false);
    setEasterActive(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  useEffect(() => {
    refreshPinAttemptState();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <Pressable onPress={focusKeyboard} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.page}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              ref={inputRef}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={5}
              autoFocus
              caretHidden
              secureTextEntry
              showSoftInputOnFocus
              style={styles.hiddenInput}
              onBlur={() => {
                if (easterActive || !navigation.isFocused()) return;
                setTimeout(() => {
                  if (!easterActive && navigation.isFocused()) {
                    inputRef.current?.focus();
                  }
                }, 300);
              }}
            />

            <View style={styles.desktop}>
                            <Animated.View
                style={[
                  styles.window,
                  { transform: [{ translateX: entranceAnim }, { translateX: shakeAnim }] },
                ]}
              >

                <View style={styles.titleBar}>
                  <View style={styles.titleLeft}>
                    <Image source={LOGO_ICON} style={styles.titleLogoImage} resizeMode="contain" />

                    <Text style={styles.titleText}>Blbej server - Přihlášení</Text>
                  </View>

                  <View style={styles.windowButtons}>
                    <View style={styles.windowButton}>
                      <Pressable style={styles.closePressable} onPress={handleMinimize}>
                        <Image source={MINIMIZE_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                      </Pressable>
                    </View>

                    <View style={styles.windowButton}>
                      <Pressable style={styles.closePressable} onPress={startEasterEgg}>
                        <Image source={MAXIMIZE_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                      </Pressable>
                    </View>

                    <View style={[styles.windowButton, styles.closeButton]}>
                      <Pressable style={styles.closePressable} onPress={handleCloseApp}>
                        <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={styles.windowBody}>
                  <View style={styles.dialogIcon}>
                    <Text style={styles.dialogIconText}>🔐</Text>
                  </View>

                  <Text style={styles.heading}>Zadej 5místný PIN</Text>

                  <Text style={styles.description}>
                    Po zadání 5 číslic tě systém automaticky pustí dál.
                  </Text>

                  <View style={styles.pinRow}>
                    {[0, 1, 2, 3, 4].map((index) => {
                      const filled = pin.length > index;
                      return (
                        <Pressable
                          key={index}
                          onPress={focusKeyboard}
                          style={[styles.pinBox, filled && styles.pinBoxFilled]}
                        >
                          <Text style={styles.pinDot}>{filled ? '●' : ''}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {errorText ? (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{errorText}</Text>
                    </View>
                  ) : (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        {authWaiting
                          ? 'Čekám na schválení adminem...'
                          : isCheckingPin
                            ? 'Ověřuji PIN...'
                            : 'Numerická klávesnice se otevře automaticky.'}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    disabled={easterActive}
                    style={({ pressed }) => [
                      styles.xpButton,
                      easterActive && styles.xpButtonDisabled,
                      pressed && !easterActive && styles.xpButtonPressed,
                    ]}
                    onPress={focusKeyboard}
                  >
                    <Text style={[styles.xpButtonText, easterActive && styles.xpButtonTextDisabled]}>
                      {easterActive ? `BLOCKED - Zavři vejce! (${easterIndex+1}/10)` : 'Otevřít klávesnici'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.statusBar}>
                  <Text style={styles.statusText}>Ready</Text>
                  <View style={styles.statusRight}>
                    <View style={styles.statusAnimWrap}>
                      <StatusAnimation
                        status={getServerStatusType(serverStatusText)}
                        size={18}
                      />
                    </View>
                    <Text style={styles.statusText}>{serverStatusText}</Text>
                  </View>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>

      <Modal visible={adminSetupVisible} transparent animationType="fade" onRequestClose={resetAdminSetup}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Admin setup</Text>
              <Pressable style={styles.modalCloseButton} onPress={resetAdminSetup}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {errorText ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorText}</Text>
                </View>
              ) : null}

              {adminSetupStep === 'question' ? (
                <>
                  <Text style={styles.modalQuestionTitle}>{ADMIN_SETUP_QUESTION}</Text>
                  <TextInput
                    value={adminSetupAnswer}
                    onChangeText={setAdminSetupAnswer}
                    placeholder="Odpověď"
                    style={styles.modalInput}
                    autoFocus
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable style={[styles.xpButton, { marginTop: 12 }]} onPress={handleAdminSetupAnswer}>
                    <Text style={styles.xpButtonText}>Potvrdit</Text>
                  </Pressable>
                </>
              ) : null}

              {adminSetupStep === 'pin' ? (
                <>
                  <Text style={styles.modalQuestionTitle}>Nastav nový admin PIN</Text>

                  <TextInput
                    value={adminSetupPin}
                    onChangeText={(value) => setAdminSetupPin(value.replace(/[^0-9]/g, '').slice(0, 5))}
                    placeholder="PIN 1x"
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={5}
                    autoFocus
                  />

                  <TextInput
                    value={adminSetupPinConfirm}
                    onChangeText={(value) => setAdminSetupPinConfirm(value.replace(/[^0-9]/g, '').slice(0, 5))}
                    placeholder="PIN znovu"
                    style={styles.modalInput}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={5}
                  />

                  <Pressable style={[styles.xpButton, { marginTop: 8 }]} onPress={() => setAdminSetupStep('password')}>
                    <Text style={styles.xpButtonText}>Pokračovat</Text>
                  </Pressable>
                </>
              ) : null}

              {adminSetupStep === 'password' ? (
                <>
                  <Text style={styles.modalQuestionTitle}>Nastav heslo pro obnovu PINu</Text>

                  <TextInput
                    value={adminSetupPassword}
                    onChangeText={setAdminSetupPassword}
                    placeholder="Heslo 1x"
                    style={styles.modalInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    autoFocus
                  />

                  <TextInput
                    value={adminSetupPasswordConfirm}
                    onChangeText={setAdminSetupPasswordConfirm}
                    placeholder="Heslo znovu"
                    style={styles.modalInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                  />

                  <Pressable
                    disabled={isSavingAdminSetup}
                    hitSlop={8}
                    style={[styles.xpButton, { marginTop: 8 }, isSavingAdminSetup && styles.xpButtonDisabled]}
                    onPressIn={handleAdminSetupSavePress}
                    onPress={handleAdminSetupSavePress}
                  >
                    <Text style={styles.xpButtonText}>
                      {isSavingAdminSetup ? 'Ukládám...' : 'Uložit a pokračovat'}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={recoveryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRecoveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Recovery</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setRecoveryModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              {recoveryMessage ? (
                <>
                  <Text style={styles.modalMessage}>{recoveryMessage}</Text>
                  <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={() => setRecoveryModalVisible(false)}>
                    <Text style={styles.xpButtonText}>OK</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.modalQuestionTitle}>Zapomenutý PIN</Text>
                  <Text style={styles.modalLabel}>Kontrolní 2 slova</Text>
                  <TextInput
                    value={recoveryWords}
                    onChangeText={setRecoveryWords}
                    placeholder="2 slova"
                    style={styles.modalInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    value={recoveryEmail}
                    onChangeText={setRecoveryEmail}
                    placeholder="Nový email"
                    style={styles.modalInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    value={recoveryPassword}
                    onChangeText={setRecoveryPassword}
                    placeholder="Heslo k novému emailu"
                    style={styles.modalInput}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {recoveryMessage ? <Text style={styles.errorText}>{recoveryMessage}</Text> : null}
                  <Pressable style={[styles.xpButton, { marginTop: 4 }]} onPress={submitRecoveryRequest}>
                    <Text style={styles.xpButtonText}>Odeslat adminovi</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={waitingModalVisible} transparent animationType="fade" onRequestClose={() => setWaitingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Čekejte na potvrzení od GM</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setWaitingModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>Vaše zařízení čeká na schválení administrátorem.</Text>
              <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={() => setWaitingModalVisible(false)}>
                <Text style={styles.xpButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={approvedModalVisible} transparent animationType="fade" onRequestClose={() => setApprovedModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Vstup povolen</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setApprovedModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>Game master povolil váš vstup. Zadejte PIN a vstupte :){'\n\n'}Máte 5 minut na zadání PINu.</Text>
              <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={() => setApprovedModalVisible(false)}>
                <Text style={styles.xpButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectedModalVisible} transparent animationType="fade" onRequestClose={() => setRejectedModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Zamítnuto</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setRejectedModalVisible(false)}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>Zařízení bylo zamítnuto adminem.</Text>
              <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={() => setRejectedModalVisible(false)}>
                <Text style={styles.xpButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Easter egg timer on top */}
      {easterActive && (
        <View style={styles.easterTimerBar}>
          <Text style={styles.easterTimerText}>⏰ {easterTimer}s - Zavři všechna vejce! {easterIndex+1}/10</Text>
        </View>
      )}

      {/* Easter egg modal - sequential */}
      <Modal visible={easterActive} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.easterOverlay} pointerEvents="box-none">
          <View style={[styles.easterWindow, { top: easterPos.top, left: easterPos.left, transform: [{ scale: easterScale }] }]}>
            <View style={styles.easterTitleBar}>
              <Text style={styles.easterTitleText}>Egg {easterIndex+1}/10 - {easterTimer}s</Text>
              <Pressable style={styles.easterCloseButton} onPress={closeCurrentEgg}>
                <Text style={styles.easterCloseText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.easterBody}>
              <Image source={EGG_IMAGES[easterIndex]} style={styles.easterImage} resizeMode="contain" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal visible={easterFinished} transparent animationType="fade" onRequestClose={closeEasterFinal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Message from Admin</Text>
              <Pressable style={styles.modalCloseButton} onPress={closeEasterFinal}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>PRETEND ADMIN</Text>
              <Text style={[styles.modalMessage, { marginTop: 8, fontSize: 15 }]}>FAKE USER MODE</Text>
              <Text style={[styles.modalMessage, { marginTop: 12, fontSize: 12, fontWeight: '700' }]}>Rekonstrukce v běhu. Vše se přesouvá na nový level.</Text>
              <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={closeEasterFinal}>
                <Text style={styles.xpButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Failed modal */}
      <Modal visible={easterFailed} transparent animationType="fade" onRequestClose={closeEasterFinal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalWindow}>
            <View style={styles.modalTitleBar}>
              <Text style={styles.modalTitleText}>Too slow!</Text>
              <Pressable style={styles.modalCloseButton} onPress={closeEasterFinal}>
                <Text style={styles.modalCloseButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalMessage}>Čas vypršel! Zkus to znovu 😂</Text>
              <Pressable style={[styles.xpButton, { marginTop: 14 }]} onPress={closeEasterFinal}>
                <Text style={styles.xpButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PinEntry;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0058d8' },
  page: { flex: 1, backgroundColor: '#1f7a7a' },
  scrollContent: { flexGrow: 1 },
  desktop: { flex: 1, backgroundColor: '#1f7a7a', paddingTop: 24, paddingHorizontal: 16, paddingBottom: 22, alignItems: 'center', justifyContent: 'flex-start' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0, color: 'transparent' },
  window: { width: '94%', maxWidth: 430, backgroundColor: '#ece9d8', borderWidth: 3, borderColor: '#0754d8', shadowColor: '#000000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 0.3, shadowRadius: 0, elevation: 10 },
  titleBar: { height: 36, backgroundColor: '#0a5be7', borderBottomWidth: 2, borderBottomColor: '#003f9e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 5 },
  titleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  titleLogoImage: { width: 20, height: 20, marginRight: 7 },
  titleText: { color: '#ffffff', fontSize: 14, fontWeight: '800', flexShrink: 1, textShadowColor: '#00245c', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  windowButtons: { flexDirection: 'row', marginLeft: 8 },
  windowButton: {
    width: 22,
    height: 22,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  closeButton: { marginLeft: 4 },
  windowButtonText: { color: '#003c8f', fontSize: 13, fontWeight: '900', lineHeight: 15 },
  closeButtonText: { color: '#ffffff', fontSize: 18, lineHeight: 19 },
  closePressable: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  windowBody: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18, alignItems: 'center' },
  dialogIcon: { width: 64, height: 64, backgroundColor: '#ffffff', borderWidth: 2, borderTopColor: '#808080', borderLeftColor: '#808080', borderRightColor: '#ffffff', borderBottomColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dialogIconText: { fontSize: 32 },
  heading: { fontSize: 22, fontWeight: '900', color: '#000000', textAlign: 'center', marginBottom: 7 },
  description: { fontSize: 13, color: '#222222', textAlign: 'center', lineHeight: 18, marginBottom: 18 },
  pinRow: { flexDirection: 'row', marginBottom: 18 },
  pinBox: { width: 42, height: 54, backgroundColor: '#ffffff', borderWidth: 2, borderTopColor: '#6e6e6e', borderLeftColor: '#6e6e6e', borderRightColor: '#ffffff', borderBottomColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginHorizontal: 3 },
  pinBoxFilled: { backgroundColor: '#eaf2ff' },
  pinDot: { fontSize: 24, color: '#000000', fontWeight: '900' },
  infoBox: { width: '100%', backgroundColor: '#fff8d7', borderWidth: 1, borderColor: '#b9a85c', paddingVertical: 8, paddingHorizontal: 10, marginBottom: 14 },
  infoText: { fontSize: 12, color: '#3a3200', textAlign: 'center', fontWeight: '700' },
  errorBox: { width: '100%', backgroundColor: '#ffd7d7', borderWidth: 1, borderColor: '#a80000', paddingVertical: 8, paddingHorizontal: 10, marginBottom: 14 },
  errorText: { fontSize: 12, color: '#8a0000', textAlign: 'center', fontWeight: '900' },
  xpButton: { minWidth: 170, height: 36, backgroundColor: '#ece9d8', borderWidth: 2, borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#777777', borderBottomColor: '#777777', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  xpButtonPressed: { borderTopColor: '#777777', borderLeftColor: '#777777', borderRightColor: '#ffffff', borderBottomColor: '#ffffff', backgroundColor: '#d8d5c6' },
  xpButtonDisabled: { backgroundColor: '#aaaaaa', borderTopColor: '#777777', borderLeftColor: '#777777' },
  xpButtonText: { color: '#000000', fontSize: 13, fontWeight: '700' },
  xpButtonTextDisabled: { color: '#555555' },
  statusBar: { minHeight: 25, backgroundColor: '#d6d3c3', borderTopWidth: 1, borderTopColor: '#aaa793', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: '#333333', fontSize: 11, flexShrink: 1 },
  statusRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  statusAnimWrap: { width: 16, height: 16, marginRight: 5, alignItems: 'center', justifyContent: 'center' },

  easterTimerBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 42, backgroundColor: '#ff0000', borderBottomWidth: 3, borderBottomColor: '#8a0000', alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 20 },
  easterTimerText: { color: '#ffffff', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  easterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  easterWindow: { position: 'absolute', width: 200, backgroundColor: '#ece9d8', borderWidth: 3, borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#003c9e', borderBottomColor: '#003c9e', shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, elevation: 15 },
  easterTitleBar: { height: 28, backgroundColor: '#0058d8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 },
  easterTitleText: { color: '#fff', fontSize: 11, fontWeight: '900', flex: 1 },
  easterCloseButton: { width: 20, height: 20, backgroundColor: '#e04b31', borderWidth: 1, borderTopColor: '#fff', borderLeftColor: '#fff', borderRightColor: '#8f1d10', borderBottomColor: '#8f1d10', alignItems: 'center', justifyContent: 'center' },
  easterCloseText: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 15 },
  easterBody: { padding: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  easterImage: { width: 160, height: 160 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalWindow: { width: '100%', maxWidth: 360, backgroundColor: '#ece9d8', borderWidth: 3, borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#003c9e', borderBottomColor: '#003c9e' },
  modalTitleBar: { height: 34, backgroundColor: '#0058d8', borderBottomWidth: 2, borderBottomColor: '#003f9e', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 5 },
  modalTitleText: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  modalCloseButton: { width: 22, height: 22, backgroundColor: '#e04b31', borderWidth: 1, borderTopColor: '#ffffff', borderLeftColor: '#ffffff', borderRightColor: '#8f1d10', borderBottomColor: '#8f1d10', alignItems: 'center', justifyContent: 'center' },
  modalCloseButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '900', lineHeight: 19 },
  modalBody: { padding: 16, alignItems: 'center', minWidth: 280 },
  modalQuestionTitle: { color: '#000000', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  modalInput: { width: '100%', height: 42, backgroundColor: '#ffffff', color: '#000000', fontSize: 14, paddingHorizontal: 10, borderWidth: 2, borderTopColor: '#6e6e6e', borderLeftColor: '#6e6e6e', borderRightColor: '#ffffff', borderBottomColor: '#ffffff', marginBottom: 10 },
  modalMessage: { color: '#000000', fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
