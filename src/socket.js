// src/socket.js

import { io } from 'socket.io-client';

const SERVER_URL = 'https://mychatfinal-production.up.railway.app';
export const socket = io(SERVER_URL, {
  path: '/socket.io',
  transports: ['websocket'],
  reconnection: true,
});