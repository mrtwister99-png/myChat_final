import { createAudioPlayer } from 'expo-audio';

const soundPlayers = {
  error: null,
  inAppMessage: null,
  xpstart: null,
};

const playSound = (key, asset) => {
  try {
    if (!soundPlayers[key]) {
      soundPlayers[key] = createAudioPlayer(asset);
    }

    soundPlayers[key].seekTo(0);
    soundPlayers[key].play();
  } catch (e) {
    console.warn('sound error', e);
  }
};

export const playInAppMessageSound = () => {
  playSound('error', require('../assets/sounds/error.mp3'));
};

export const playInAppChatMessageSound = () => {
  playSound('inAppMessage', require('../assets/sounds/inappp.mp3'));
};

export const playXpStartSound = () => {
  playSound('xpstart', require('../assets/sounds/xpstart.mp3'));
};
