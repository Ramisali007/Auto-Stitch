const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');

const path = require('path');
dotenv.config();
connectDB();

const app = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Rate Limiting
app.use(globalLimiter);
app.use('/api/auth', authLimiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🧵 Auto Stitch API is running', timestamp: new Date().toISOString() });
});

// NOTE: Admin setup removed — use `node create_admin.js` CLI script instead

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/boutiques', require('./routes/boutiqueRoutes'));
app.use('/api/bids', require('./routes/bidRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api', require('./routes/subscriptionRoutes'));



// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const http = require('http');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Auto Stitch Server running on http://localhost:${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});
