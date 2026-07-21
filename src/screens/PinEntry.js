import React, { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socket } from '../socket';

const DEFAULT_USER_PIN = '1111';
const DEFAULT_ADMIN_PIN = '8831';
const USER_SCREEN = 'UzivatelPin';
const ADMIN_SCREEN = 'AdminPin';

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

const PinEntry = ({ navigation }) => {
  const [pin, setPin] = useState('');
  const [errorText, setErrorText] = useState('');
  const [serverStatusText, setServerStatusText] = useState('Připojuji server...');
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const inputRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(t);
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
          socket.emit('client:ready', { lastUserId: storedLastUserId });
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
      if (lastId) socket.emit('client:ready', { lastUserId: lastId });
    };
    const handleDisconnect = () => { setServerStatusText('Server offline - jede lokální režim'); setIsCheckingPin(false); };
    const handleConnectError = () => { setServerStatusText('Server nedostupný'); setIsCheckingPin(false); };

    const handleAuthSuccess = async (payload) => {
      setIsCheckingPin(false);
      setPin('');
      setErrorText('');

      // FIX 2 + 3 - ulož id a pošli push token
      if (payload?.role === 'user') {
        globalThis.CUSIIK_CURRENT_ROLE = 'user';
        globalThis.CUSIIK_CURRENT_USER_ID = payload.userId;
        globalThis.CUSIIK_CURRENT_USER_NAME = payload.userName;
        await AsyncStorage.multiSet([
          ['lastUserId', payload.userId],
          ['lastUserName', payload.userName || ''],
        ]);
        globalThis.CUSIIK_LAST_USER_ID = payload.userId;
      }

      if (payload?.role === 'admin') {
        globalThis.CUSIIK_CURRENT_ROLE = 'admin';
        globalThis.CUSIIK_CURRENT_USER_ID = null;
      }

      if (globalThis.CUSIIK_EXPO_PUSH_TOKEN) {
        socket.emit('notifications:registerToken', {
          token: globalThis.CUSIIK_EXPO_PUSH_TOKEN,
          role: payload.role,
          userId: payload.userId || null,
        });
      }

      if (payload?.role === 'admin') { navigation.replace(ADMIN_SCREEN); return; }
      if (payload?.role === 'user') { navigation.replace(USER_SCREEN, { userId: payload.userId }); return; }
      handleWrongPin();
    };

    const handleAuthError = (payload) => { setIsCheckingPin(false); setErrorText(payload?.message || 'Špatný PIN.'); shakeWindow(); };
    const handleUserKicked = async ({ userId, preserveIdentity, specialPin } = {}) => {
      const shouldPreserveIdentity = Boolean(preserveIdentity && userId);

      if (shouldPreserveIdentity) {
        const cleanUserId = String(userId);
        globalThis.CUSIIK_LAST_USER_ID = cleanUserId;
        await AsyncStorage.setItem('lastUserId', cleanUserId);
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = specialPin || '0008';
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

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('auth:success', handleAuthSuccess);
    socket.on('auth:error', handleAuthError);
    socket.on('user:kicked', handleUserKicked);
    socket.on('room:kicked', handleRoomKicked);

    if (socket.connected) setServerStatusText('Server online'); else socket.connect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('auth:success', handleAuthSuccess);
      socket.off('auth:error', handleAuthError);
      socket.off('user:kicked', handleUserKicked);
      socket.off('room:kicked', handleRoomKicked);
    };
  }, [navigation]);

  const getCurrentUserPin = () => globalThis.CUSIIK_USER_PIN || DEFAULT_USER_PIN;
  const getCurrentAdminPin = () => globalThis.CUSIIK_ADMIN_PIN || DEFAULT_ADMIN_PIN;
  const focusKeyboard = () => { inputRef.current?.blur(); setTimeout(()=>inputRef.current?.focus(), 120); };
  const resetAndFocus = () => { setPin(''); setIsCheckingPin(false); setTimeout(()=>inputRef.current?.focus(), 150); };

  const shakeWindow = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]).start(resetAndFocus);
  };

  const handleWrongPin = () => {
    setErrorText('Špatný PIN.');
    shakeWindow();
  };

  const handleLocalPinCheck = (cleanValue) => {
    const currentUserPin = getCurrentUserPin();
    const currentAdminPin = getCurrentAdminPin();

    if (cleanValue === currentUserPin) {
      const localUserName = getRandomLocalUserName();
      globalThis.CUSIIK_CURRENT_ROLE = 'user';
      globalThis.CUSIIK_CURRENT_USER_NAME = localUserName;
      setPin('');
      navigation.replace(USER_SCREEN, { userName: localUserName });
      return;
    }

    if (cleanValue === currentAdminPin) {
      globalThis.CUSIIK_CURRENT_ROLE = 'admin';
      setPin('');
      navigation.replace(ADMIN_SCREEN);
      return;
    }

    handleWrongPin();
  };

  const handlePinChange = (value) => {
    if (isCheckingPin) {
      return;
    }

    const cleanValue = value.replace(/[^0-9]/g, '').slice(0, 4);

    setPin(cleanValue);
    setErrorText('');

    if (cleanValue.length !== 4) {
      return;
    }

    setTimeout(() => {
      if (socket.connected) {
        setIsCheckingPin(true);
        setServerStatusText('Ověřuji PIN přes server...');

        socket.emit('auth:checkPin', {
          pin: cleanValue,
          lastUserId: globalThis.CUSIIK_LAST_USER_ID || null,
        });

        return;
      }

      handleLocalPinCheck(cleanValue);
    }, 150);
  };

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
              maxLength={4}
              autoFocus
              caretHidden
              secureTextEntry
              showSoftInputOnFocus
              style={styles.hiddenInput}
              onBlur={() => {
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 300);
              }}
            />

            <View style={styles.desktop}>
              <Animated.View
                style={[
                  styles.window,
                  {
                    transform: [{ translateX: shakeAnim }],
                  },
                ]}
              >
                <View style={styles.titleBar}>
                  <View style={styles.titleLeft}>
                    <View style={styles.windowsIcon}>
                      <View style={[styles.winSquare, { backgroundColor: '#f35325' }]} />
                      <View style={[styles.winSquare, { backgroundColor: '#81bc06' }]} />
                      <View style={[styles.winSquare, { backgroundColor: '#05a6f0' }]} />
                      <View style={[styles.winSquare, { backgroundColor: '#ffba08' }]} />
                    </View>

                    <Text style={styles.titleText}>Cusiik Chat-XP - Přihlášení</Text>
                  </View>

                  <View style={styles.windowButtons}>
                    <View style={styles.windowButton}>
                      <Text style={styles.windowButtonText}>_</Text>
                    </View>

                    <View style={styles.windowButton}>
                      <Text style={styles.windowButtonText}>□</Text>
                    </View>

                    <View style={[styles.windowButton, styles.closeButton]}>
                      <Text style={[styles.windowButtonText, styles.closeButtonText]}>
                        ×
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.windowBody}>
                  <View style={styles.dialogIcon}>
                    <Text style={styles.dialogIconText}>🔐</Text>
                  </View>

                  <Text style={styles.heading}>Zadej 4místný PIN</Text>

                  <Text style={styles.description}>
                    Po zadání 4 číslic tě systém automaticky pustí dál.
                  </Text>

                  <View style={styles.pinRow}>
                    {[0, 1, 2, 3].map((index) => {
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
                        {isCheckingPin
                          ? 'Ověřuji PIN...'
                          : 'Numerická klávesnice se otevře automaticky.'}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [
                      styles.xpButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={focusKeyboard}
                  >
                    <Text style={styles.xpButtonText}>Otevřít klávesnici</Text>
                  </Pressable>
                </View>

                <View style={styles.statusBar}>
                  <Text style={styles.statusText}>Ready</Text>
                  <Text style={styles.statusText}>{serverStatusText}</Text>
                </View>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
};

export default PinEntry;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0058d8',
  },

  page: {
    flex: 1,
    backgroundColor: '#1f7a7a',
  },

  scrollContent: {
    flexGrow: 1,
  },

  desktop: {
    flex: 1,
    backgroundColor: '#1f7a7a',
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    color: 'transparent',
  },

  window: {
    width: '94%',
    maxWidth: 430,
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 10,
  },

  titleBar: {
    height: 36,
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
    fontSize: 14,
    fontWeight: '800',
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

  windowBody: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },

  dialogIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  dialogIconText: {
    fontSize: 32,
  },

  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 7,
  },

  description: {
    fontSize: 13,
    color: '#222222',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },

  pinRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },

  pinBox: {
    width: 50,
    height: 54,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#6e6e6e',
    borderLeftColor: '#6e6e6e',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },

  pinBoxFilled: {
    backgroundColor: '#eaf2ff',
  },

  pinDot: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '900',
  },

  infoBox: {
    width: '100%',
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  infoText: {
    fontSize: 12,
    color: '#3a3200',
    textAlign: 'center',
    fontWeight: '700',
  },

  errorBox: {
    width: '100%',
    backgroundColor: '#ffd7d7',
    borderWidth: 1,
    borderColor: '#a80000',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },

  errorText: {
    fontSize: 12,
    color: '#8a0000',
    textAlign: 'center',
    fontWeight: '900',
  },

  xpButton: {
    minWidth: 170,
    height: 36,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  xpButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  xpButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },

  statusBar: {
    minHeight: 25,
    backgroundColor: '#d6d3c3',
    borderTopWidth: 1,
    borderTopColor: '#aaa793',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  statusText: {
    color: '#333333',
    fontSize: 11,
    flexShrink: 1,
  },
});