import Constants from 'expo-constants';
import { initializeApp } from 'firebase/app';

const firebaseConfig = Constants.expoConfig?.extra?.firebase;

if (!firebaseConfig?.projectId) {
  throw new Error('Chybí konfigurace Firebase v expo.extra.firebase.');
}

export const firebaseApp = initializeApp(firebaseConfig);