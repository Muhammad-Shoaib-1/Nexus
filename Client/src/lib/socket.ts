import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

let socket: Socket | null = null;

// Lazily creates (or reuses) a single authenticated socket connection.
export const getSocket = (): Socket => {
  if (socket && socket.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: getToken() },
    autoConnect: true
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
