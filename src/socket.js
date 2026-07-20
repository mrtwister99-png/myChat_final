// src/socket.js

import { io } from 'socket.io-client';

/**
 * Railway server.
 * Lokální IP už se nepoužívá.
 */
const SERVER_URL = 'https://mychatfinal-production.up.railway.app';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});