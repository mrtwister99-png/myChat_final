// server/push.js - real Expo push for killed/background
const PUSH_TOKENS = {
  users: {}, // userId -> expoPushToken
  admins: {}, // socketId or adminId -> token
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const sendExpoPush = async ({ token, title, body, data = {} }) => {
  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
    return false;
  }
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      }),
    });
    const result = await response.json();
    // console.log('Push result:', result);
    return true;
  } catch (e) {
    console.error('Expo push failed:', e?.message || e);
    return false;
  }
};

const registerPushToken = ({ token, role, userId, socketId }) => {
  if (!token) return;
  if (role === 'admin') {
    PUSH_TOKENS.admins[socketId || userId || 'admin'] = token;
  } else if (role === 'user' && userId) {
    PUSH_TOKENS.users[String(userId)] = token;
  }
};

const getUserPushToken = (userId) => {
  return PUSH_TOKENS.users[String(userId)] || null;
};

const getAdminPushTokens = () => {
  return Object.values(PUSH_TOKENS.admins);
};

const removePushTokenBySocket = (socketId) => {
  if (PUSH_TOKENS.admins[socketId]) {
    delete PUSH_TOKENS.admins[socketId];
  }
};

module.exports = {
  PUSH_TOKENS,
  sendExpoPush,
  registerPushToken,
  getUserPushToken,
  getAdminPushTokens,
  removePushTokenBySocket,
};
