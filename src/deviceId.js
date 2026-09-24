import { v4 as uuidv4 } from 'uuid';
import { getStoredValue, setStoredValue } from './storage';

export async function getOrCreateDeviceId() {
  let deviceId = await getStoredValue('DEVICE_ID');

  if (!deviceId) {
    deviceId = uuidv4();
    await setStoredValue('DEVICE_ID', deviceId);
  }

  return deviceId;
}