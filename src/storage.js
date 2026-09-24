import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export async function getStoredValue(key) {
  try {
    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue !== null) {
      return secureValue;
    }
  } catch {}

  return AsyncStorage.getItem(key);
}

export async function setStoredValue(key, value) {
  try {
    await SecureStore.setItemAsync(key, value);
    return;
  } catch {}

  await AsyncStorage.setItem(key, value);
}