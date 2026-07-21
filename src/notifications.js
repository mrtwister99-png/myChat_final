// Push notifikace - základní ukázka přes Expo Notifications
// instalace:
// npx expo install expo-notifications expo-device

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

const getLastNotificationAt = () => {
  return Number(globalThis.CUSIIK_LAST_NOTIFICATION_AT || 0);
};

const setLastNotificationAt = (timestamp) => {
  globalThis.CUSIIK_LAST_NOTIFICATION_AT = Number(timestamp || 0);
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0b3d91',
    sound: 'default',
  });

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  if (isExpoGo) {
    // In Expo Go (SDK 53+), remote push token support was removed.
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
};

export const showLocalMessageNotification = async ({ title, body }) => {
  const now = Date.now();
  const lastNotificationAt = getLastNotificationAt();

  if (lastNotificationAt > 0 && now - lastNotificationAt < NOTIFICATION_COOLDOWN_MS) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });

  setLastNotificationAt(now);
  return true;
};