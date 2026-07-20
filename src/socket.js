// src/socket.js

import { io } from 'socket.io-client';

/**
 * Lokální server na notebooku.
 * Telefon v Expo Go musí být na stejné Wi-Fi jako notebook.
 * Nepoužívej localhost, protože na telefonu by localhost znamenal telefon.
 */
const SERVER_URL = 'http://192.168.229.197:3001';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});