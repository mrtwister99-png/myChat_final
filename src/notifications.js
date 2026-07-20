// Push notifikace - základní ukázka přes Expo Notifications
// instalace:
// npx expo install expo-notifications expo-device

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export const registerForPushNotificationsAsync = async () => {
  if (!Device.isDevice) {
    return null;
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
};

export const showLocalMessageNotification = async ({ title, body }) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};