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
    // FIX CHYBA 1 - kick musí klient poslouchat
    const handleKick = async ({ reason }) => {
      if (globalThis.CUSIIK_CURRENT_ROLE === 'admin') {
        return;
      }

      console.log('KICK:', reason);
      await AsyncStorage.multiRemove(['lastUserId', 'lastUserName']);
      globalThis.CUSIIK_LAST_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_ID = null;
      globalThis.CUSIIK_CURRENT_USER_NAME = null;
      globalThis.CUSIIK_CURRENT_ROLE = null;
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: 'PinEntry' }],
        });
      }
    };

    socket.on('user:kicked', handleKick);
    socket.on('room:kicked', handleKick);

    return () => {
      socket.off('user:kicked', handleKick);
      socket.off('room:kicked', handleKick);
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