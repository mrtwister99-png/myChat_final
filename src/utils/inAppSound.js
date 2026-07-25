import { createAudioPlayer } from 'expo-audio';

let player = null;

export const playInAppMessageSound = () => {
  try {
    if (!player) {
      player = createAudioPlayer(require('../assets/sounds/inapp.mp3'));
    }
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn('inapp sound error', e);
  }
};
