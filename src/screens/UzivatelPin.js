// src/screens/uzivatelPin.js

import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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

const CURRENT_USER_ID = '1';
const CURRENT_USER_NAME = 'Uzivatel 1';

const HELPER_MESSAGES = [
  'server lagguje , muzes zkusit zvysit rate na 0,5 ?',
  'mam ted 1200 ms , da se s tim neco delat ?',
  'muzes me teleportovat na souradnice [2,0]',
];

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

const getInitialMessages = () => {
  const chats = getGlobalChats();

  if (!chats[CURRENT_USER_ID]) {
    chats[CURRENT_USER_ID] = [
      {
        id: 1,
        sender: 'admin',
        text: 'Ahoj, tady admin. Napiš mi zprávu.',
        createdAt: Date.now(),
      },
    ];
  }

  return chats[CURRENT_USER_ID];
};

const UzivatelPin = ({ navigation }) => {
  const scrollViewRef = useRef(null);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(getInitialMessages);
  const [adminStatus, setAdminStatus] = useState(getAdminStatus());
  const [nowTick, setNowTick] = useState(Date.now());
  const [blockedInfo, setBlockedInfo] = useState('');
  const [helperMessageIndex, setHelperMessageIndex] = useState(0);

  const isAdminOnline = adminStatus === 'on';
  const currentHelperMessage = HELPER_MESSAGES[helperMessageIndex];

  const getMuteUntil = () => {
    const mutedUsers = getGlobalMutedUsers();
    return mutedUsers[CURRENT_USER_ID] || 0;
  };

  const muteUntil = getMuteUntil();
  const isMuted = muteUntil > nowTick;
  const muteTimeLeft = isMuted ? formatMuteTimeLeft(muteUntil) : '';

  const refreshScreenData = () => {
    const chats = getGlobalChats();

    setAdminStatus(getAdminStatus());
    setMessages(chats[CURRENT_USER_ID] || getInitialMessages());
    setNowTick(Date.now());
  };

  useEffect(() => {
    refreshScreenData();

    const interval = setInterval(() => {
      refreshScreenData();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
    });

    return unsubscribe;
  }, [navigation]);

  const saveMessages = (nextMessages) => {
    const chats = getGlobalChats();

    chats[CURRENT_USER_ID] = nextMessages;
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

    const nextMessages = [...messages, newMessage];

    saveMessages(nextMessages);
    setMessage('');
    setBlockedInfo('');

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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

              <Text style={styles.titleText}>Chat s adminem</Text>

              <View
                style={[
                  styles.titleStatusDot,
                  isAdminOnline ? styles.statusOnline : styles.statusOffline,
                ]}
              />

              <Text style={styles.titleStatusText}>
                {isAdminOnline ? 'on' : 'off'}
              </Text>
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
              onContentSizeChange={() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }}
            >
              {messages.map((item) => {
                const isUser = item.sender === 'user';
                const isSystem = item.sender === 'system';

                if (isSystem) {
                  return (
                    <View key={item.id} style={styles.systemMessageRow}>
                      <View style={styles.systemMessageBox}>
                        <Text style={styles.systemMessageText}>{item.text}</Text>
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
                                  : styles.statusOffline,
                              ]}
                            />

                            <Text style={styles.messageStatusText}>
                              {isAdminOnline ? 'on' : 'off'}
                            </Text>
                          </>
                        ) : null}
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
            <Text style={styles.statusText}>Připojeno jako uživatel</Text>
            <Text style={styles.statusText}>
              {isMuted
                ? `Umlčen: ${muteTimeLeft}`
                : `Admin: ${isAdminOnline ? 'online' : 'offline'}`}
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
  },
});