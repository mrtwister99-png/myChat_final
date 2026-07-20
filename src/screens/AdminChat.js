import React, { useEffect, useRef, useState } from 'react';
import {
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

  const [message, setMessage] = useState('');
  const [muteModalVisible, setMuteModalVisible] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

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
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getMuteUntil = () => {
    const mutedUsers = getGlobalMutedUsers();
    return mutedUsers[userId] || 0;
  };

  const muteUntil = getMuteUntil();
  const isMuted = muteUntil > nowTick;
  const muteTimeLeft = isMuted ? formatMuteTimeLeft(muteUntil) : 'není umlčen';

  const saveMessages = (nextMessages) => {
    const chats = getGlobalChats();

    chats[userId] = nextMessages;
    setMessages(nextMessages);
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
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

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const openMuteModal = () => {
    setMuteModalVisible(true);
  };

  const closeMuteModal = () => {
    setMuteModalVisible(false);
  };

  const muteUser = (option) => {
    const mutedUsers = getGlobalMutedUsers();
    const muteUntilTime = Date.now() + option.milliseconds;

    mutedUsers[userId] = muteUntilTime;

    const systemMessage = {
      id: Date.now(),
      sender: 'system',
      text: `Uživatel ${userName} byl umlčen na ${option.label}.`,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, systemMessage];

    saveMessages(nextMessages);
    setNowTick(Date.now());
    closeMuteModal();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const unmuteUser = () => {
    const mutedUsers = getGlobalMutedUsers();

    delete mutedUsers[userId];

    const systemMessage = {
      id: Date.now(),
      sender: 'system',
      text: `Uživatel ${userName} už není umlčen.`,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, systemMessage];

    saveMessages(nextMessages);
    setNowTick(Date.now());
    closeMuteModal();

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.replace('AdminPin');
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

              <Text style={styles.titleText}>Chat s uživatelem</Text>
            </View>

            <View style={styles.windowButtons}>
              <View style={styles.windowButton}>
                <Text style={styles.windowButtonText}>_</Text>
              </View>

              <View style={styles.windowButton}>
                <Text style={styles.windowButtonText}>□</Text>
              </View>

              <View style={[styles.windowButton, styles.closeButton]}>
                <Text style={[styles.windowButtonText, styles.closeButtonText]}>×</Text>
              </View>
            </View>
          </View>

          <View style={styles.topPanel}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBack}
            >
              <Text style={styles.backButtonText}>Zpět</Text>
            </Pressable>

            <View style={styles.userInfoBox}>
              <Text style={styles.userName}>{userName}</Text>

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

            <Pressable
              style={({ pressed }) => [
                styles.muteButton,
                isMuted && styles.muteButtonActive,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={openMuteModal}
            >
              <Text style={styles.muteButtonText}>
                {isMuted ? 'Umlčení' : 'Umlčet'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.chatArea}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {messages.map((item) => {
                const isAdmin = item.sender === 'admin';
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
                      isAdmin ? styles.messageRowAdmin : styles.messageRowUser,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isAdmin ? styles.adminBubble : styles.userBubble,
                      ]}
                    >
                      <View style={styles.messageHeaderRow}>
                        <Text style={styles.messageAuthor}>
                          {isAdmin ? 'Admin' : userName}
                        </Text>

                        <Text style={styles.messageTime}>{messageTime}</Text>
                      </View>

                      <Text style={styles.messageText}>{item.text}</Text>
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
                pressed && styles.sendButtonPressed,
              ]}
              onPress={sendMessage}
            >
              <Text style={styles.sendButtonText}>Odeslat</Text>
            </Pressable>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Admin chat</Text>
            <Text style={styles.statusText}>
              {isMuted ? `Mute: ${muteTimeLeft}` : 'User can write'}
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
                      <Text style={styles.modalButtonText}>Zrušit umlčení</Text>
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
      </KeyboardAvoidingView>
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
    minWidth: 82,
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

  muteButtonActive: {
    backgroundColor: '#ffd7d7',
  },

  muteButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
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

  messageRowUser: {
    justifyContent: 'flex-start',
  },

  messageRowAdmin: {
    justifyContent: 'flex-end',
  },

  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
  },

  userBubble: {
    backgroundColor: '#ece9d8',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },

  adminBubble: {
    backgroundColor: '#dceaff',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
  },

  messageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },

  messageAuthor: {
    color: '#003c9e',
    fontSize: 11,
    fontWeight: '900',
    marginRight: 10,
  },

  messageTime: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
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
});