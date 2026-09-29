const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const activeUsers = new Map(); // userId -> Set of socketIds

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.CLIENT_URL],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true
    }
  });

  // JWT Handshake Authentication Middleware
  io.use((socket, next) => {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers?.authorization) {
      token = socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '');
    }
    if (!token && socket.handshake.headers?.cookie) {
      const match = socket.handshake.headers.cookie.match(/accessToken=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (_) {
        // Handshake continues, but socket is unauthenticated
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    let currentUserId = null;

    // User joins their personal room for notifications & presence (Protected against IDOR)
    socket.on('join_user', (userId) => {
      if (!userId) return;
      const targetId = userId.toString();

      // If user is authenticated, ensure they cannot join someone else's private channel
      if (socket.user && socket.user.role !== 'admin' && socket.user.id !== targetId) {
        console.warn(`[SOCKET SECURITY] Blocked attempt by ${socket.user.id} to join unauthorized user room ${targetId}`);
        return;
      }

      currentUserId = targetId;
      socket.join(currentUserId);
      
      if (!activeUsers.has(currentUserId)) {
        activeUsers.set(currentUserId, new Set());
      }
      activeUsers.get(currentUserId).add(socket.id);

      // Broadcast user online status
      io.emit('user_status_change', { userId: currentUserId, status: 'online' });
    });

    // Request online status of specific user or list
    socket.on('check_user_online', (userId, callback) => {
      const isOnline = activeUsers.has(userId?.toString()) && activeUsers.get(userId.toString()).size > 0;
      if (typeof callback === 'function') {
        callback({ isOnline });
      }
    });

    // User joins a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
    });

    // Typing Indicators
    socket.on('typing', ({ chatId, senderName, senderId }) => {
      socket.to(chatId).emit('user_typing', { chatId, senderName, senderId });
    });

    socket.on('stop_typing', ({ chatId, senderId }) => {
      socket.to(chatId).emit('user_stop_typing', { chatId, senderId });
    });

    // Direct in-chat quotation
    socket.on('send_quotation', (quoteData) => {
      const { chatId } = quoteData;
      if (chatId) {
        io.to(chatId).emit('receive_quotation', quoteData);
      }
    });

    socket.on('disconnect', () => {
      if (currentUserId && activeUsers.has(currentUserId)) {
        const userSockets = activeUsers.get(currentUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          activeUsers.delete(currentUserId);
          io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = { initSocket, getIO };

