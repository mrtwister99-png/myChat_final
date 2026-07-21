// App.js
import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PinEntry from './src/screens/PinEntry';
import UzivatelPin from './src/screens/UzivatelPin';
import AdminPin from './src/screens/AdminPin';
import AdminChat from './src/screens/AdminChat';
import { registerForPushNotificationsAsync } from './src/notifications';
import { showLocalMessageNotification } from './src/notifications';
import { socket } from './src/socket';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

const App = () => {
  useEffect(() => {
    const init = async () => {
      // načti posledního uživatele
      const [lastUserId, lastUserName] = await Promise.all([
        AsyncStorage.getItem('lastUserId'),
        AsyncStorage.getItem('lastUserName'),
      ]);

      if (lastUserId) {
        globalThis.CUSIIK_LAST_USER_ID = lastUserId;
      }

      if (lastUserName) {
        globalThis.CUSIIK_CURRENT_USER_NAME = lastUserName;
      }

      // push token
      const token = await registerForPushNotificationsAsync();
      if (token) {
        globalThis.CUSIIK_EXPO_PUSH_TOKEN = token;
      }
    };
    init();
  }, []);

  useEffect(() => {
    const lastUserMessageCounts = {};
    let isFirstSync = true;

    const handleChatMessages = ({ userId, messages }) => {
      if (globalThis.CUSIIK_CURRENT_ROLE !== 'admin') {
        return;
      }

      const cleanUserId = String(userId || '');
      if (!cleanUserId) {
        return;
      }

      const safeMessages = Array.isArray(messages) ? messages : [];
      const nextUserCount = safeMessages.filter((item) => item?.sender === 'user').length;
      const previousUserCount = lastUserMessageCounts[cleanUserId] || 0;

      lastUserMessageCounts[cleanUserId] = nextUserCount;

      if (isFirstSync) {
        isFirstSync = false;
        return;
      }

      if (nextUserCount > previousUserCount) {
        showLocalMessageNotification({
          title: 'Nová zpráva od uživatele',
          body: 'Otevři admin chat.',
        });
      }
    };

    socket.on('chat:messages', handleChatMessages);

    return () => {
      socket.off('chat:messages', handleChatMessages);
    };
  }, []);

  useEffect(() => {
    const resetToPinEntry = () => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'PinEntry' }],
        });
      }
    };

    const handleUserKick = async ({ reason, userId, preserveIdentity, specialPin } = {}) => {
      if (globalThis.CUSIIK_CURRENT_ROLE === 'admin') {
        return;
      }

      console.log('KICK:', reason);

      const shouldPreserveIdentity = Boolean(preserveIdentity && userId);

      if (shouldPreserveIdentity) {
        const cleanUserId = String(userId);
        globalThis.CUSIIK_LAST_USER_ID = cleanUserId;
        await AsyncStorage.setItem('lastUserId', cleanUserId);
        globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = specialPin || '0008';
      } else {
        await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
        globalThis.CUSIIK_LAST_USER_ID = null;
      }

      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_NAME = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;

      resetToPinEntry();
    };

    const handleRoomKick = async ({ reason } = {}) => {
      if (globalThis.CUSIIK_CURRENT_ROLE === 'admin') {
        return;
      }

      console.log('ROOM KICK:', reason);
      await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
      globalThis.CUSIIK_LAST_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_NAME = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      globalThis.CUSIIK_SPECIAL_RELOGIN_PIN = null;

      resetToPinEntry();
    };

    socket.on('user:kicked', handleUserKick);
    socket.on('room:kicked', handleRoomKick);

    return () => {
      socket.off('user:kicked', handleUserKick);
      socket.off('room:kicked', handleRoomKick);
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="PinEntry" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="PinEntry" component={PinEntry} />
        <Stack.Screen name="UzivatelPin" component={UzivatelPin} />
        <Stack.Screen name="AdminPin" component={AdminPin} />
        <Stack.Screen name="AdminChat" component={AdminChat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;