import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    // FIX: novejsi expo-notifications uz bere tyhle dva, shouldShowAlert je deprecated
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId,
  });
  return tokenData.data;
}

export async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('chat_reply', [
    {
      identifier: 'reply',
      buttonTitle: 'Odpovědět',
      // FIX: bez textInput Android neukaze pole na psani -> userText byl vzdy prazdny
      // a odpoved se nikdy neodeslala
      textInput: { submitButtonTitle: 'Odeslat', placeholder: 'Napiš odpověď…' },
      options: { opensAppToForeground: false },
    },
    { identifier: 'open', buttonTitle: 'Otevřít', options: { opensAppToForeground: true } },
  ]);
}

export const showLocalMessageNotification = async ({ title, body, data = {} }) => {
  try {
    await Notifications.scheduleNotificationAsync({
      // FIX: driv se neposilalo data -> "Otevřít" nevedelo, ktery chat otevrit
      content: { title, body, data, sound: 'notification.caf', categoryIdentifier: 'chat_reply' },
      trigger: null,
    });
  } catch {}
};

export const dismissNotification = async (identifier) => {
  try {
    if (identifier) {
      await Notifications.dismissNotificationAsync(identifier);
    }
  } catch {}
};

export const addNotificationResponseListener = (cb) => {
  return Notifications.addNotificationResponseReceivedListener((res) => {
    cb(res.notification.request.content.data, res);
  });
};

// Cislo na ikonce appky na plose (+1, +3...).
// Android: cislo ukazuji jen nektere launchery (Samsung, Xiaomi, Huawei...),
// cisty Android / Pixel ukaze jen tecku. iOS funguje vzdy.
export const setAppBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, Number(count) || 0));
  } catch {}
};
