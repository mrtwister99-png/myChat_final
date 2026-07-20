import { io } from 'socket.io-client';

/**
 * Sem dej IP svého počítače.
 * POZOR: z telefonu v Expo Go nepoužívej localhost.
 */
const SERVER_URL = 'http://192.168.229.197:3001';

export const socket = io(SERVER_URL, {
  transports: ['websocket'],
  autoConnect: true,
});