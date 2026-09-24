// src/socket.js
import { io } from 'socket.io-client';

const SERVER_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

if (!SERVER_URL) {
  throw new Error('Chybí EXPO_PUBLIC_SOCKET_URL.');
}

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
});

// FIX: pojistka proti zacykleni re-authu. Kdyz je ulozeny PIN spatny,
// kazdy reconnect = jeden spatny pokus a po 5 pokusech server zablokuje
// IP na 15 minut - tim se clovek nedostane ani do prihlasovaci obrazovky.
globalThis.CUSIIK_REAUTH_FAILS = globalThis.CUSIIK_REAUTH_FAILS || 0;

socket.on('auth:error', () => {
  globalThis.CUSIIK_REAUTH_FAILS = (globalThis.CUSIIK_REAUTH_FAILS || 0) + 1;
});

socket.on('auth:success', () => {
  globalThis.CUSIIK_REAUTH_FAILS = 0;
});

// klient pošle své lastUserId jakmile se připojí
socket.on('connect', () => {
  const lastUserId = globalThis.CUSIIK_LAST_USER_ID;
  const deviceId = globalThis.CUSIIK_DEVICE_ID;
  if (lastUserId || deviceId) {
    socket.emit('client:ready', { lastUserId: lastUserId || null, deviceId: deviceId || null });
  }
});