import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
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

const KeyboardWrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;

const EYE_ICON = require('../assets/icons/oko.png');
const EYE_SLASH_ICON = require('../assets/icons/okoskrtt.png');
const EYE_SECRET_MUTED_ICON = require('../assets/icons/okopotaji.png');
const BACK_ICON = require('../assets/icons/backsipka.png');
const MINIMIZE_ICON = require('../assets/icons/minimalize.png');
const EXIT_ICON = require('../assets/icons/exit.png');
const LOGO_ICON = require('../assets/icons/logoxp.png');
const ANNOUNCEMENT_PREFIX = '[[ANNOUNCEMENT]]';

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

const hexToRgba = (hex, alpha = 0.24) => {
  const cleanHex = String(hex || '').replace('#', '');

  if (cleanHex.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

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

const normalizeAvatarIcon = (iconKey) => {
  const cleanIcon = String(iconKey || '').trim().toLowerCase();
  if (cleanIcon === 'klan') return 'klaun';
  if (cleanIcon === 'fucker') return 'fuckerr';
  return USER_ICON_SOURCES[cleanIcon] ? cleanIcon : 'uzivatel';
};

const getIconSource = (iconKey) => {
  return USER_ICON_SOURCES[normalizeAvatarIcon(iconKey)] || USER_ICON_SOURCES.uzivatel;
};

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

const getGlobalAdminReadCounts = () => {
  if (!globalThis.CUSIIK_ADMIN_READ_COUNTS) {
    globalThis.CUSIIK_ADMIN_READ_COUNTS = {};
  }

  return globalThis.CUSIIK_ADMIN_READ_COUNTS;
};

const formatMuteTimeLeft = (muteUntil) => {
  const now = Date.now();
  const diff = muteUntil - now;

  if (diff <= 0) {
    return 'není umlčen';
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

  return `${hours}:${minutes}`;
};

const AdminChat = ({ navigation, route }) => {
  const userId = route?.params?.userId || 'unknown-user';
  const userName = route?.params?.userName || 'Uživatel';

    const scrollViewRef = useRef(null);
  const lastMessageTapRef = useRef({ messageId: null, timestamp: 0 });
  const suppressNextMessagePressRef = useRef(false);
  const screenWidth = Dimensions.get('window').width;
  const screenSlideAnim = useRef(new Animated.Value(screenWidth)).current;
  const screenFadeAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
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
  }, []);

  const scrollToBottom = (animated = true) => {

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 120);
  };

  const [message, setMessage] = useState('');
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [reactingMessageId, setReactingMessageId] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [serverMutedUsers, setServerMutedUsers] = useState(getGlobalMutedUsers());
  const [secretMutedUsers, setSecretMutedUsers] = useState(
    globalThis.CUSIIK_SECRET_MUTED_USERS || {}
  );
  const [currentUserData, setCurrentUserData] = useState(null);
  const [adminAvatarIcon, setAdminAvatarIcon] = useState('admin');
  const [adminProfile, setAdminProfile] = useState(globalThis.CUSIIK_ADMIN_PROFILE || { icon: 'admin', silhouetteColour: '#0b3d91', bgColour: '#ece9d8' });
  const [connectionText, setConnectionText] = useState(
    socket.connected ? 'Server online' : 'Připojuji server...'
  );

  const getInitialMessages = () => {
    const chats = getGlobalChats();

    if (!chats[userId]) {
      chats[userId] = [
        {
          id: 1,
          sender: 'user',
          text: `Ahoj, tady ${userName}.`,
          createdAt: Date.now(),
        },
      ];
    }

    return chats[userId].filter(
      (item) => !String(item?.text || '').startsWith(ANNOUNCEMENT_PREFIX)
    );
  };

  const [messages, setMessages] = useState(getInitialMessages);
  const [userReadAt, setUserReadAt] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID = String(userId);
    scrollToBottom(false);
  });

  const unsubscribeBlur = navigation.addListener('blur', () => {
    if (String(globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID || '') === String(userId)) {
      globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID = null;
    }
  });

  return () => {
    unsubscribe();
    unsubscribeBlur();

    if (String(globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID || '') === String(userId)) {
      globalThis.CUSIIK_ACTIVE_ADMIN_CHAT_USER_ID = null;
    }
  };
}, [navigation, userId]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  useEffect(() => {
    if (!selectionMode) {
      setSelectedMessageIds([]);
    }
  }, [selectionMode]);

  useEffect(() => {
    const handleConnect = () => {
      setConnectionText('Server online');

      socket.emit('state:get');

      socket.emit('chat:get', {
        userId,
      });
    };

    const handleDisconnect = () => {
      setConnectionText('Server offline - lokální režim');
    };

    const handleConnectError = () => {
      setConnectionText('Server nedostupný - lokální režim');
    };

    const handleServerState = (serverState) => {
      if (serverState?.mutedUsers) {
        setServerMutedUsers(serverState.mutedUsers);
        globalThis.CUSIIK_MUTED_USERS = serverState.mutedUsers;
      }

      if (serverState?.secretMutedUsers) {
        setSecretMutedUsers(serverState.secretMutedUsers);
        globalThis.CUSIIK_SECRET_MUTED_USERS = serverState.secretMutedUsers;
      }

      if (serverState?.adminProfile) {
        setAdminProfile(serverState.adminProfile);
        setAdminAvatarIcon(normalizeAvatarIcon(serverState.adminProfile.icon || 'admin'));
        globalThis.CUSIIK_ADMIN_PROFILE = serverState.adminProfile;
      }

      if (Array.isArray(serverState?.users)) {
        const found = serverState.users.find((u) => String(u.id) === String(userId));
        if (found) {
          setCurrentUserData(found);
        }
      }
    };

    const handleChatMessages = ({ userId: incomingUserId, messages: nextMessages, readAt }) => {
      if (incomingUserId !== userId) {
        return;
      }

      const chats = getGlobalChats();
      const safeMessages = (nextMessages || []).filter(
        (item) => !String(item?.text || '').startsWith(ANNOUNCEMENT_PREFIX)
      );
      const userMessageCount = safeMessages.filter((item) => item?.sender === 'user').length;
      const nextReadCounts = {
        ...getGlobalAdminReadCounts(),
        [userId]: userMessageCount,
      };

      chats[userId] = safeMessages;
      globalThis.CUSIIK_ADMIN_READ_COUNTS = nextReadCounts;
      if (Number.isFinite(Number(readAt))) {
        setUserReadAt(Number(readAt));
      }
      setMessages(safeMessages);
    };

    const handleChatRead = ({ userId: incomingUserId, readAt }) => {
      if (String(incomingUserId) !== String(userId)) {
        return;
      }

      setUserReadAt(Number(readAt || 0));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);
    socket.on('chat:read', handleChatRead);

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('server:state', handleServerState);
      socket.off('chat:messages', handleChatMessages);
      socket.off('chat:read', handleChatRead);
    };
  }, [userId]);

  useEffect(() => {
    const chats = getGlobalChats();

    setMessages(
      (chats[userId] || getInitialMessages()).filter(
        (item) => !String(item?.text || '').startsWith(ANNOUNCEMENT_PREFIX)
      )
    );

    if (socket.connected) {
      socket.emit('chat:get', {
        userId,
      });
    }
  }, [userId]);

  const getMuteUntil = () => {
    const mutedUsers = getGlobalMutedUsers();

    return serverMutedUsers[userId] || mutedUsers[userId] || 0;
  };

  const muteUntil = getMuteUntil();
  const isMuted = muteUntil > nowTick;
  const muteTimeLeft = isMuted ? formatMuteTimeLeft(muteUntil) : 'není umlčen';
  const isSecretMuted = Boolean(secretMutedUsers[userId]);
  const isServerOnline = socket.connected;

  const saveMessages = (nextMessages) => {
    const chats = getGlobalChats();

    chats[userId] = nextMessages;
    setMessages(nextMessages);
  };

  const sendSystemMessage = (text) => {
    if (socket.connected) {
      socket.emit('chat:send', {
        userId,
        sender: 'system',
        text,
      });

      return;
    }

    const systemMessage = {
      id: Date.now(),
      sender: 'system',
      text,
      createdAt: Date.now(),
    };

    saveMessages([...messages, systemMessage]);
  };

  const sendMessage = () => {
    if (selectionMode) {
      const selectedCount = selectedMessageIds.length;

      if (selectedCount === 0) {
        setSelectionMode(false);
        return;
      }

      Alert.alert(
        'Smazat zprávy',
        `Opravdu smazat ${selectedCount} zpráv?`,
        [
          {
            text: 'Ne',
            style: 'cancel',
          },
          {
            text: 'Ano, smazat',
            style: 'destructive',
            onPress: () => {
              if (socket.connected) {
                socket.emit('chat:deleteMessages', {
                  userId,
                  messageIds: selectedMessageIds,
                });
              } else {
                const selectedSet = new Set(selectedMessageIds.map((id) => String(id)));
                const nextMessages = messages.filter(
                  (item) => !selectedSet.has(String(item.id))
                );

                saveMessages(nextMessages);
              }

              setSelectionMode(false);
              setSelectedMessageIds([]);
            },
          },
        ]
      );

      return;
    }

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (socket.connected) {
      socket.emit('chat:send', {
        userId,
        sender: 'admin',
        text: trimmedMessage,
      });

      setMessage('');
      return;
    }

    const newMessage = {
      id: Date.now(),
      sender: 'admin',
      text: trimmedMessage,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, newMessage];

    saveMessages(nextMessages);
    setMessage('');
  };

  const openMuteModal = () => {
    setMuteModalVisible(true);
  };

  const closeMuteModal = () => {
    setMuteModalVisible(false);
  };

  const muteUser = (option) => {
    const mutedUsers = { ...getGlobalMutedUsers() };
    const secretMutedUsersMap = {
      ...secretMutedUsers,
    };
    const muteUntilTime = Date.now() + option.milliseconds;

    delete secretMutedUsersMap[userId];
    delete secretMutedUsersMap[String(userId)];
    setSecretMutedUsers(secretMutedUsersMap);
    globalThis.CUSIIK_SECRET_MUTED_USERS = secretMutedUsersMap;

    mutedUsers[userId] = muteUntilTime;
    mutedUsers[String(userId)] = muteUntilTime;
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

    setServerMutedUsers({
      ...serverMutedUsers,
      [userId]: muteUntilTime,
      [String(userId)]: muteUntilTime,
    });
    setNowTick(Date.now());

       if (socket.connected) {
      socket.emit('admin:muteUser', {
        userId,
        milliseconds: option.milliseconds,
      });
    }


    sendSystemMessage(`Uživatel ${userName} byl umlčen na ${option.label}.`);

    closeMuteModal();
  };

  const unmuteUser = () => {
    const mutedUsers = { ...getGlobalMutedUsers() };

    delete mutedUsers[userId];
    delete mutedUsers[String(userId)];
    globalThis.CUSIIK_MUTED_USERS = mutedUsers;

    const nextServerMutedUsers = {
      ...serverMutedUsers,
    };

    delete nextServerMutedUsers[userId];
    delete nextServerMutedUsers[String(userId)];

    setServerMutedUsers(nextServerMutedUsers);
    setNowTick(Date.now());

    if (socket.connected) {
      socket.emit('admin:unmuteUser', {
        userId,
      });
    }

    sendSystemMessage(`Uživatel ${userName} už není umlčen.`);

    closeMuteModal();
  };

  const goBack = () => {
    Keyboard.dismiss();

    // FIX: žádná ruční exit animace - necháváme čistě na vestavěné navigační
    // animaci (App.js má animation: 'slide_from_right'), která při goBack()
    // automaticky přehraje zrcadlový přechod (na druhou stranu, logicky).
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.replace('AdminPin');
  };

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });

    return () => backSubscription.remove();
  }, [navigation]);


  const handleMinimize = () => {
    goBack();
  };

  const closeApp = () => {
    try {
      BackHandler.exitApp();
    } catch {}
  };

  const toggleMessageSelection = (messageId) => {
    setSelectedMessageIds((current) => {
      const nextId = String(messageId);
      const exists = current.some((item) => String(item) === nextId);

      let nextSelection;

      if (exists) {
        nextSelection = current.filter((item) => String(item) !== nextId);
      } else {
        nextSelection = [...current, messageId];
      }

      if (nextSelection.length === 0) {
        setSelectionMode(false);
      }

      return nextSelection;
    });
  };

  const setMessageReaction = (messageId, reactionKey) => {
    const targetMessage = messages.find((item) => String(item.id) === String(messageId));
    const currentReactions = getMessageReactions(targetMessage);
    const nextReaction = currentReactions.admin === reactionKey ? null : reactionKey;
    const nextMessages = messages.map((item) =>
      String(item.id) === String(messageId)
        ? {
            ...item,
            reaction: undefined,
            reactions: { ...getMessageReactions(item), admin: nextReaction },
          }
        : item
    );

    saveMessages(nextMessages);
    setReactingMessageId(null);

    if (socket.connected) {
      socket.emit('chat:react', {
        userId,
        messageId,
        reaction: nextReaction,
      });
    }
  };

  const onMessageLongPress = (messageId) => {
    suppressNextMessagePressRef.current = true;

    if (selectionMode) {
      toggleMessageSelection(messageId);
      return;
    }

    setReactingMessageId((currentId) =>
      String(currentId) === String(messageId) ? null : messageId
    );
  };

  const onMessagePress = (messageId) => {
    if (suppressNextMessagePressRef.current) {
      suppressNextMessagePressRef.current = false;
      return;
    }

    if (selectionMode) {
      toggleMessageSelection(messageId);
      return;
    }

    const now = Date.now();
    const cleanMessageId = String(messageId);
    const previousTap = lastMessageTapRef.current;
    const isDoubleTap =
      previousTap.messageId === cleanMessageId &&
      now - previousTap.timestamp <= 320;

    lastMessageTapRef.current = isDoubleTap
      ? { messageId: null, timestamp: 0 }
      : { messageId: cleanMessageId, timestamp: now };
    setReactingMessageId(null);

    if (isDoubleTap) {
      setSelectionMode(true);
      setSelectedMessageIds([messageId]);
    }
  };

  const toggleSecretMute = () => {
    const nextValue = !isSecretMuted;
    const nextSecretMutedUsers = {
      ...secretMutedUsers,
    };
    const uidStr = String(userId);

    if (nextValue) {
      nextSecretMutedUsers[userId] = true;
      nextSecretMutedUsers[uidStr] = true;
    } else {
      delete nextSecretMutedUsers[userId];
      delete nextSecretMutedUsers[uidStr];
    }

    setSecretMutedUsers(nextSecretMutedUsers);
    globalThis.CUSIIK_SECRET_MUTED_USERS = nextSecretMutedUsers;
    setNowTick(Date.now());

    if (socket.connected) {
      socket.emit('admin:secretMuteUser', {
        userId,
        enabled: nextValue,
      });

      if (nextValue) {
        socket.emit('admin:unmuteUser', {
          userId,
        });
      }
    }

    if (nextValue) {
      const mutedUsers = { ...getGlobalMutedUsers() };
      delete mutedUsers[userId];
      delete mutedUsers[uidStr];
      globalThis.CUSIIK_MUTED_USERS = mutedUsers;

      const nextServerMutedUsers = {
        ...serverMutedUsers,
      };

      delete nextServerMutedUsers[userId];
      delete nextServerMutedUsers[uidStr];
      setServerMutedUsers(nextServerMutedUsers);
      setNowTick(Date.now());
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <KeyboardWrapper
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
              <Animated.View
          style={[
            styles.window,
            { transform: [{ translateX: screenSlideAnim }], opacity: screenFadeAnim },
          ]}
        >
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <Image source={LOGO_ICON} style={styles.titleLogoImage} resizeMode="contain" />

              <Text style={styles.titleText}>Chat s uživatelem</Text>

              <View
                style={[
                  styles.titleStatusDot,
                  isServerOnline ? styles.titleStatusOnline : styles.titleStatusOffline,
                ]}
              />

              <Text style={styles.titleStatusText}>{isServerOnline ? 'on' : 'off'}</Text>
            </View>

            <View style={styles.windowButtons}>
              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={goBack}>
                  <Image source={BACK_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={handleMinimize}>
                  <Image source={MINIMIZE_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>

              <View style={[styles.windowButton, styles.closeButton]}>
                <Pressable style={styles.closePressable} onPress={closeApp}>
                  <Image source={EXIT_ICON} style={styles.windowButtonIcon} resizeMode="contain" />
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.topPanel}>
            <Image
              source={getIconSource(currentUserData?.avatarIcon || 'uzivatel')}
              style={styles.userHeaderIcon}
              resizeMode="contain"
            />

            <View style={styles.userInfoBox}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{userName}</Text>

                {isSecretMuted ? <Text style={styles.userNameSecretText}> (potají­)</Text> : null}

                {isMuted ? <Text style={styles.userNameMuteText}> ({muteTimeLeft})</Text> : null}
              </View>

              <View style={styles.muteStatusRow}>
                <View
                  style={[
                    styles.muteStatusDot,
                    isMuted ? styles.muteStatusMuted : styles.muteStatusOk,
                  ]}
                />

                <Text style={styles.muteStatusText}>
                  {isMuted ? `Umlčen: ${muteTimeLeft}` : 'Může psát'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonsGroup}>
              <Pressable
                style={({ pressed }) => [
                  styles.muteButton,
                  isSecretMuted && styles.eyeToggleButtonActive,
                  !isSecretMuted && isMuted && styles.eyeToggleButtonMuted,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={toggleSecretMute}
                onLongPress={openMuteModal}
                delayLongPress={260}
              >
                <Image
                  source={isSecretMuted ? EYE_SECRET_MUTED_ICON : (isMuted ? EYE_SLASH_ICON : EYE_ICON)}
                  style={styles.muteButtonIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>

          {isSecretMuted ? (
            <View style={styles.secretMutedBanner}>
              <Text style={styles.secretMutedBannerText}>
                Uzivatel je umlcen potaji - neuvidí, ze je umlcen
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
                const isAdmin = item.sender === 'admin';
                const isSystem = item.sender === 'system';
                const messageTime = formatMessageTime(item.createdAt);
                const isSelected = selectedMessageIds.some(
                  (selectedId) => String(selectedId) === String(item.id)
                );

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

                const userOutlineColour = currentUserData?.silhouetteColour || currentUserData?.colour || '#0b3d91';
                const userBgColour = currentUserData?.bgColour || '#ece9d8';
                const adminOutlineColour = adminProfile?.silhouetteColour || '#0b3d91';
                const adminBgColour = adminProfile?.bgColour || '#ece9d8';
                const iconOutlineColour = isAdmin ? adminOutlineColour : userOutlineColour;
                const iconBgColour = isAdmin ? adminBgColour : userBgColour;
                const messageReactions = getMessageReactions(item);
                const userReaction = getReactionByKey(messageReactions.user);
                const adminReaction = getReactionByKey(messageReactions.admin);
                const isPickerOpenForThis = String(reactingMessageId) === String(item.id);

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isAdmin ? styles.messageRowUser : styles.messageRowAdmin,
                    ]}
                  >
                    <View style={[styles.miniIconWrapper, { borderColor: iconOutlineColour, backgroundColor: iconBgColour, borderWidth: 2 }]}>
                      <Image
                        source={getIconSource(isAdmin ? (adminProfile?.icon || adminAvatarIcon || 'admin') : (currentUserData?.avatarIcon || 'uzivatel'))}
                        style={styles.miniIconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.messageBubbleColumn}>
                    <Pressable
                      onLongPress={() => onMessageLongPress(item.id)}
                      onPress={() => onMessagePress(item.id)}
                      delayLongPress={250}
                      style={({ pressed }) => [
                        styles.messageBubble,
                        isAdmin ? styles.userBubble : styles.adminBubble,
                        !isSelected && {
                          borderRightColor: iconOutlineColour,
                          borderBottomColor: iconOutlineColour,
                        },
                        isSelected && styles.selectedMessageBubble,
                        pressed && { opacity: 0.85 },
                      ]}
                    >

                      {!isSelected && (userReaction || adminReaction) ? (
                        <View pointerEvents="none" style={styles.reactionColourLayer}>
                          {userReaction && adminReaction ? (
                            <>
                              <View style={[styles.reactionColourHalf, { backgroundColor: hexToRgba(userReaction.colour) }]} />
                              <View style={[styles.reactionColourHalf, { backgroundColor: hexToRgba(adminReaction.colour) }]} />
                            </>
                          ) : (
                            <View
                              style={[
                                styles.reactionColourFill,
                                { backgroundColor: hexToRgba((userReaction || adminReaction).colour) },
                              ]}
                            />
                          )}
                        </View>
                      ) : null}

                      <View style={styles.messageContent}>
                      <View style={styles.messageHeaderRow}>
                        <Text style={styles.messageAuthor}>
                          {isAdmin ? 'Admin' : userName}
                        </Text>
                        <Text style={styles.messageTime}>{messageTime}</Text>
                        {isAdmin ? (
                          <Text style={styles.readReceipt}>
                            {userReadAt >= Number(item.createdAt || 0) ? 'Zobrazeno' : 'Nezobrazeno'}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.messageText}>{item.text}</Text>
                      </View>

                      {!isSelected && (userReaction || adminReaction) ? (
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
                      <View style={[styles.reactionPickerRow, isAdmin ? styles.reactionPickerRowAdmin : styles.reactionPickerRowUser]}>
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
                  </View>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputPanel}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={`Napiš zprávu pro ${userName}...`}
              placeholderTextColor="#666666"
              style={styles.input}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />

            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                selectionMode && styles.deleteButton,
                pressed && styles.sendButtonPressed,
              ]}
              onPress={sendMessage}
            >
              <Text style={styles.sendButtonText}>
                {selectionMode ? 'Smazat' : 'Odeslat'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Admin chat</Text>
            <Text style={styles.statusText}>
              {selectionMode
                ? `Vybráno: ${selectedMessageIds.length}`
                : isMuted
                  ? `Mute: ${muteTimeLeft}`
                  : connectionText}
            </Text>
                    </View>
        </Animated.View>

        <Modal
          visible={muteModalVisible}

          transparent
          animationType="fade"
          onRequestClose={closeMuteModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Umlčet uživatele</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeMuteModal}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>
                  Vyber délku umlčení pro uživatele:
                </Text>

                <Text style={styles.selectedUserText}>{userName}</Text>

                {isMuted ? (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      Uživatel je aktuálně umlčen ještě na {muteTimeLeft}.
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
                      onPress={() => muteUser(option)}
                    >
                      <Text style={styles.muteOptionText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  {isMuted ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.modalButton,
                        pressed && styles.xpButtonPressed,
                      ]}
                      onPress={unmuteUser}
                    >
                      <Text style={styles.modalButtonText}>Zrušit mlčení</Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeMuteModal}
                  >
                    <Text style={styles.modalButtonText}>Zavřít</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardWrapper>
    </SafeAreaView>
  );
};

export default AdminChat;

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

  titleStatusOnline: {
    backgroundColor: '#28c840',
  },

  titleStatusOffline: {
    backgroundColor: '#ff3b30',
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

  closeButton: {
    marginLeft: 4,
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

  topPanel: {
    backgroundColor: '#ece9d8',
    borderBottomWidth: 2,
    borderBottomColor: '#aaa793',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    height: 38,
    minWidth: 70,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  backButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  userInfoBox: {
    flex: 1,
    paddingHorizontal: 10,
  },

  userName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 3,
  },

  userListItemIcon: {
    width: 36,
    height: 36,
    marginRight: 8,
  },

  userHeaderIcon: {
    width: 38,
    height: 38,
    marginRight: 10,
  },

  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  userNameMetaText: {
    color: '#8a4d00',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },

  userNameSecretText: {
    color: '#7a00cc',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },

  userNameMuteText: {
    color: '#8a4d00',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },

  muteStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  muteStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginRight: 5,
  },

  muteStatusOk: {
    backgroundColor: '#28c840',
  },

  muteStatusMuted: {
    backgroundColor: '#ff3b30',
  },

  muteStatusText: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '700',
  },

  muteButton: {
    height: 38,
    width: 42,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },

  muteButtonIcon: {
    width: 18,
    height: 18,
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
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  messageRow: {
    width: '100%',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    width: 30,
    height: 30,
  },

  messageRowUser: {
    justifyContent: 'flex-end',
  },

  messageRowAdmin: {
    justifyContent: 'flex-start',
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
    flexWrap: 'wrap',
    marginTop: 6,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 5,
    paddingVertical: 6,
  },

  reactionPickerRowAdmin: {
    alignSelf: 'flex-end',
  },

  reactionPickerRowUser: {
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
    marginHorizontal: 2,
  },

  reactionPickerEmoji: {
    fontSize: 16,
  },

  userBubble: {
    backgroundColor: '#dceaff',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
  },

  adminBubble: {
    backgroundColor: '#ece9d8',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  messageAuthor: {
    color: '#003c9e',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 8,
  },

  messageTime: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 6,
  },

  readReceipt: {
    color: '#245aa8',
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 6,
  },

  messageText: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 19,
  },

  selectedMessageBubble: {
    backgroundColor: '#f06a6a',
    borderTopColor: '#ffd1d1',
    borderLeftColor: '#ffd1d1',
    borderRightColor: '#8a0000',
    borderBottomColor: '#8a0000',
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
    alignItems: 'center',
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

  deleteButton: {
    backgroundColor: '#d84b4b',
    borderTopColor: '#ffd1d1',
    borderLeftColor: '#ffd1d1',
    borderRightColor: '#7f1f1f',
    borderBottomColor: '#7f1f1f',
  },

  sendButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  sendButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
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
    marginBottom: 6,
  },

  selectedUserText: {
    color: '#003c9e',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  warningBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    padding: 8,
    marginBottom: 12,
  },

  warningText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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

  xpButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  buttonsGroup: {
    flexDirection: 'row',
    gap: 6,
  },

  secretMutedBanner: {
    backgroundColor: '#ffd7d7',
    borderBottomWidth: 1,
    borderBottomColor: '#a80000',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  secretMutedBannerText: {
    color: '#8a0000',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
});
