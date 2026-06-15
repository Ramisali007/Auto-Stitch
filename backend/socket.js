const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] User connected: ${socket.id}`);

    // User joins their personal room for notifications
    socket.on('join_user', (userId) => {
      socket.join(userId);
      console.log(`[SOCKET] User ${userId} joined their notification room`);
    });

    // User joins a chat room
    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
      console.log(`[SOCKET] User joined chat room: ${chatId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${socket.id}`);
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
