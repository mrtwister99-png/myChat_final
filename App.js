// App.js
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import PinEntry from './src/screens/PinEntry';
import UzivatelPin from './src/screens/UzivatelPin';
import AdminPin from './src/screens/AdminPin';
import AdminChat from './src/screens/AdminChat';
import { registerForPushNotificationsAsync, showLocalMessageNotification, addNotificationResponseListener } from './src/notifications';
import * as Notifications from 'expo-notifications';
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

        const role = globalThis.CUSIIK_CURRENT_ROLE;
        if (socket.connected && role) {
          socket.emit('notifications:registerToken', {
            token,
            role,
            userId: globalThis.CUSIIK_CURRENT_USER_ID || null,
          });
        }
      }

      // killed state - check if app opened from notification
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        const lastData = lastResponse?.notification?.request?.content?.data;
        if (lastData?.userId && lastData?.action === 'openChat') {
          setTimeout(() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('UzivatelPin', { userId: String(lastData.userId) });
            }
          }, 1200);
        }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener((data) => {
      if (data?.userId && data?.action === 'openChat' && navigationRef.isReady()) {
        navigationRef.navigate('UzivatelPin', { userId: String(data.userId) });
      }
    });
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    const lastUserMessageCounts = {};
    const userNamesById = {};
    let secretMutedUsersById = {};

    const handleServerState = (serverState) => {
      if (Array.isArray(serverState?.users)) {
        const nextNames = {};

        serverState.users.forEach((user) => {
          const cleanUserId = String(user?.id || '').trim();
          const cleanUserName = String(user?.name || '').trim();

          if (cleanUserId && cleanUserName) {
            nextNames[cleanUserId] = cleanUserName;
          }
        });

        Object.keys(userNamesById).forEach((key) => {
          delete userNamesById[key];
        });

        Object.assign(userNamesById, nextNames);
      }

      if (serverState?.secretMutedUsers && typeof serverState.secretMutedUsers === 'object') {
        secretMutedUsersById = serverState.secretMutedUsers;
      }

      if (serverState?.adminStatus) {
        globalThis.CUSIIK_ADMIN_STATUS = serverState.adminStatus;
      }
    };

    const handleChatMessages = ({ userId, messages }) => {
      if (globalThis.CUSIIK_CURRENT_ROLE !== 'admin') {
        return;
      }

      const cleanUserId = String(userId || '');
      if (!cleanUserId) {
        return;
      }

      const safeMessages = Array.isArray(messages) ? messages : [];
 const nextUserCount = safeMessages.filter((item) => {
  const s = String(item?.sender || '').toLowerCase();
  return s === 'user' || s === 'ticket';
}).length;
      const hasPrevious = Object.prototype.hasOwnProperty.call(lastUserMessageCounts, cleanUserId);
      const previousUserCount = hasPrevious ? lastUserMessageCounts[cleanUserId] : nextUserCount;

      // FIX: počet se aktualizuje VŽDY, i když admin právě chat sleduje nebo je initial load.
      // Díky tomu se po odchodu z chatu / po přihlášení nevyhodnotí staré zprávy jako nové.
      lastUserMessageCounts[cleanUserId] = nextUserCount;

      const isInitialLoadDone = Boolean(globalThis.CUSIIK_INITIAL_LOAD_DONE);

      // FIX: dokud neproběhl initial load, nikdy neposílat notifikaci (jen nastavit baseline).
      if (!isInitialLoadDone) {
        return;
      }

      // FIX: pokud jsme tuhle konverzaci ještě nikdy neviděli, jen si zapamatujeme
      // aktuální stav jako výchozí bod a notifikaci nespouštíme (řeší "notifikace hned po loginu").
      if (!hasPrevious) {
        return;
      }

      if (nextUserCount <= previousUserCount) {
        return;
      }

      const isSecretMuted = Boolean(secretMutedUsersById[cleanUserId]);

      if (isSecretMuted || AppState.currentState !== 'active') {
        return;
      }

      const senderName = userNamesById[cleanUserId] || `Uživatel ${cleanUserId}`;
      const newestIncomingMessage = [...safeMessages]
        .reverse()
        .find((item) => ['user', 'ticket'].includes(String(item?.sender || '').toLowerCase()));

      showLocalMessageNotification({
        title: `Nová zpráva od ${senderName}`,
        body: String(newestIncomingMessage?.text || 'Otevři admin chat.').slice(0, 160),
        cooldownKey: `admin-user-${cleanUserId}`,
        silent: false,
        cooldownMs: 0,
        immediate: true,
      });
    };

    socket.on('server:state', handleServerState);
    socket.on('chat:messages', handleChatMessages);

    return () => {
      socket.off('server:state', handleServerState);
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
            <Stack.Navigator
        initialRouteName="PinEntry"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
        }}
      >

        <Stack.Screen name="PinEntry" component={PinEntry} />
        <Stack.Screen name="UzivatelPin" component={UzivatelPin} />
        <Stack.Screen name="AdminPin" component={AdminPin} />
        <Stack.Screen name="AdminChat" component={AdminChat} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
