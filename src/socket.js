// src/socket.js
import { io } from 'socket.io-client';

const DEFAULT_SERVER_URL = 'https://mychatfinal-production.up.railway.app';

const SERVER_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  globalThis.CUSIIK_SERVER_URL ||
  DEFAULT_SERVER_URL;

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  reconnection: true,
});

// klient pošle své lastUserId jakmile se připojí
socket.on('connect', () => {
  const lastUserId = globalThis.CUSIIK_LAST_USER_ID;
  if (lastUserId) {
    socket.emit('client:ready', { lastUserId });
  }
});