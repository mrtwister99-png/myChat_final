import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000;

const NOTIFICATION_SOUND_NAME = Platform.OS === 'ios' ? 'notification.caf' : 'notification.mp3';
const NOTIFICATION_CHANNEL_ID = 'default-v2';

const getNotificationCooldownMap = () => {
  if (!globalThis.CUSIIK_NOTIFICATION_COOLDOWNS || typeof globalThis.CUSIIK_NOTIFICATION_COOLDOWNS !== 'object') {
    globalThis.CUSIIK_NOTIFICATION_COOLDOWNS = {};
  }

  return globalThis.CUSIIK_NOTIFICATION_COOLDOWNS;
};

const getLastNotificationAt = (cooldownKey) => {
  const cooldownMap = getNotificationCooldownMap();
  return Number(cooldownMap[cooldownKey] || 0);
};

const setLastNotificationAt = (cooldownKey, timestamp) => {
  const cooldownMap = getNotificationCooldownMap();
  cooldownMap[cooldownKey] = Number(timestamp || 0);
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

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    name: NOTIFICATION_CHANNEL_ID,
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0b3d91',
    sound: NOTIFICATION_SOUND_NAME,
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

export const showLocalMessageNotification = async ({ title, body, data = {}, cooldownKey = 'global-message' }) => {
  const safeCooldownKey = String(cooldownKey || 'global-message');
  const now = Date.now();
  const lastNotificationAt = getLastNotificationAt(safeCooldownKey);

  if (lastNotificationAt > 0 && now - lastNotificationAt < NOTIFICATION_COOLDOWN_MS) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: NOTIFICATION_SOUND_NAME,
      data: data || {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: NOTIFICATION_CHANNEL_ID,
      repeats: false,
    },
  });

  setLastNotificationAt(safeCooldownKey, now);
  return true;
};

export const addNotificationResponseListener = (callback) => {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const responseData = response?.notification?.request?.content?.data || {};
    if (typeof callback === 'function') {
      callback(responseData, response);
    }
  });
  return subscription;
};

export const getLastNotificationResponseAsync = async () => {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data || null;
  } catch {
    return null;
  }
};

export { NOTIFICATION_COOLDOWN_MS };
