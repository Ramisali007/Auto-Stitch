const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
const activeUsers = new Map(); // userId -> Set of socketIds

const initSocket = (server) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://autostitch-eight.vercel.app',
    process.env.CLIENT_URL,
  ].filter(Boolean);

  io = socketIo(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('onrender.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy: Origin not allowed'));
        }
      },
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
        // Do not authenticate tokens with pending 2FA
        if (!decoded.is2FAPending) {
          socket.user = decoded;
        }
      } catch (_) {
        // Handshake continues, but socket is unauthenticated
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    let currentUserId = null;

    // User joins their personal room for notifications & presence (Protected against IDOR & Unauthenticated spoofing)
    socket.on('join_user', (userId) => {
      if (!userId) return;

      // Require authentication
      if (!socket.user) {
        console.warn(`[SOCKET SECURITY] Blocked unauthenticated attempt to join user room ${userId}`);
        return;
      }

      const targetId = userId.toString();
      const currentAuthId = (socket.user.id || socket.user._id)?.toString();

      // Ensure user cannot join someone else's private channel
      if (socket.user.role !== 'admin' && currentAuthId !== targetId) {
        console.warn(`[SOCKET SECURITY] Blocked attempt by ${currentAuthId} to join unauthorized user room ${targetId}`);
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

    // User joins a chat room (Authenticated & Authorized participants only)
    socket.on('join_chat', (chatId) => {
      if (!socket.user || !chatId || typeof chatId !== 'string') return;
      const currentAuthId = (socket.user.id || socket.user._id)?.toString();

      if (chatId.startsWith('chat_')) {
        const parts = chatId.split('_');
        if (parts.length === 3) {
          const [, id1, id2] = parts;
          if (socket.user.role !== 'admin' && currentAuthId !== id1 && currentAuthId !== id2) {
            console.warn(`[SOCKET SECURITY] Blocked unauthorized join_chat attempt by ${currentAuthId} for ${chatId}`);
            return;
          }
        }
      }
      socket.join(chatId);
    });

    // Typing Indicators (Authenticated only)
    socket.on('typing', ({ chatId, senderName, senderId }) => {
      if (!socket.user || !chatId) return;
      socket.to(chatId).emit('user_typing', { chatId, senderName, senderId });
    });

    socket.on('stop_typing', ({ chatId, senderId }) => {
      if (!socket.user || !chatId) return;
      socket.to(chatId).emit('user_stop_typing', { chatId, senderId });
    });

    // Direct in-chat quotation (Boutique owner / Admin only)
    socket.on('send_quotation', (quoteData) => {
      if (!socket.user || (socket.user.role !== 'boutique_owner' && socket.user.role !== 'admin')) {
        console.warn(`[SOCKET SECURITY] Blocked unauthorized send_quotation attempt`);
        return;
      }
      const { chatId } = quoteData || {};
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
