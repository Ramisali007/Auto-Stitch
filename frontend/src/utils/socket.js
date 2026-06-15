import { io } from 'socket.io-client';
import API_URL from '../config/api';

let socket;

export const initSocket = (userId) => {
  if (!socket) {
    socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[SOCKET] Connected to server');
      if (userId) {
        socket.emit('join_user', userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from server');
    });
  }
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
