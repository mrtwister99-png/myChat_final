// src/socket.js
import { io } from 'socket.io-client';

const SERVER_URL = 'https://mychatfinal-production.up.railway.app';

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