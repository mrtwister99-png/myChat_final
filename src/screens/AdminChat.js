
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 120);
  };

  const [message, setMessage] = useState('');
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
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

    return chats[userId];
  };

  const [messages, setMessages] = useState(getInitialMessages);

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

    const handleChatMessages = ({ userId: incomingUserId, messages: nextMessages }) => {
      if (incomingUserId !== userId) {
        return;
      }

      const chats = getGlobalChats();
      const safeMessages = nextMessages || [];
      const userMessageCount = safeMessages.filter((item) => item?.sender === 'user').length;
      const nextReadCounts = {
        ...getGlobalAdminReadCounts(),
        [userId]: userMessageCount,
      };

      chats[userId] = safeMessages;
      globalThis.CUSIIK_ADMIN_READ_COUNTS = nextReadCounts;
      setMessages(safeMessages);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);

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
    };
  }, [userId]);

  useEffect(() => {
    const chats = getGlobalChats();

    setMessages(chats[userId] || getInitialMessages());

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
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.replace('AdminPin');
  };

  const handleMinimize = () => {
    Keyboard.dismiss();
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

  const onMessageLongPress = (messageId) => {
    setSelectionMode(true);
    toggleMessageSelection(messageId);
  };

  const onMessagePress = (messageId) => {
    if (!selectionMode) {
      return;
    }

    toggleMessageSelection(messageId);
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
        <View style={styles.window}>
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <View style={styles.windowsIcon}>
                <View style={[styles.winSquare, { backgroundColor: '#f35325' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#81bc06' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#05a6f0' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#ffba08' }]} />
              </View>

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
                  <Text style={styles.windowButtonText}>←</Text>
                </Pressable>
              </View>

              <View style={styles.windowButton}>
                <Pressable style={styles.closePressable} onPress={handleMinimize}>
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
                    <Pressable
                      onLongPress={() => onMessageLongPress(item.id)}
                      onPress={() => onMessagePress(item.id)}
                      delayLongPress={250}
                      style={({ pressed }) => [
                        styles.messageBubble,
                        isAdmin ? styles.userBubble : styles.adminBubble,
                        isSelected && styles.selectedMessageBubble,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <View style={styles.messageHeaderRow}>
                        <Text style={styles.messageAuthor}>
                          {isAdmin ? 'Admin' : userName}
                        </Text>
                        <Text style={styles.messageTime}>{messageTime}</Text>
                      </View>
                      <Text style={styles.messageText}>{item.text}</Text>
                    </Pressable>
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
        </View>

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
                  <Text style={styles.modalCloseButtonText}>Ă—</Text>
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

  messageRowUser: {
    justifyContent: 'flex-end',
  },

  messageRowAdmin: {
    justifyContent: 'flex-start',
  },

  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
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

  messageText: {
    color: '#000000',
    fontSize: 14,
    lineHeight: 19,
  },

  selectedMessageBubble: {
    backgroundColor: '#ffe38d',
    borderTopColor: '#fff7d1',
    borderLeftColor: '#fff7d1',
    borderRightColor: '#9b7f14',
    borderBottomColor: '#9b7f14',
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




