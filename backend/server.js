/**
 * ============================================================
 * AI Agriculture Disease Detection System - Main Server
 * ============================================================
 * Entry point for the Express.js backend application.
 * Sets up middleware, routes, database connection, and error handling.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');


// Import route handlers
const authRoutes = require('./routes/auth');
const detectRoutes = require('./routes/detection');
const historyRoutes = require('./routes/history');
const cropRoutes = require('./routes/crops');
const userRoutes = require('./routes/user');

// Import utilities
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// ─── App Initialization ───────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5001;

// ─── Security Middleware ──────────────────────────────────────
// Helmet sets secure HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS - Allow requests from frontend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Rate Limiting ────────────────────────────────────────────
// Prevents brute force & API abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again after 15 minutes'
  }
});
app.use('/api/', limiter);

// Stricter limit for AI detection endpoint (it's expensive)
const detectLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    success: false,
    message: 'Detection limit reached. You can analyze 20 images per hour.'
  }
});

// ─── Body Parsing Middleware ──────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // In production, log to Winston
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  }));
}

// ─── Static Files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Health Check Route ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AgriAI Disease Detection API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);                           // Authentication
app.use('/api/detect', detectLimiter, detectRoutes);        // AI Detection (rate-limited)
app.use('/api/history', historyRoutes);                     // Detection History
app.use('/api/crops', cropRoutes);                          // Crop Database
app.use('/api/user', userRoutes);                           // User Profile

// ─── Error Handling Middleware ────────────────────────────────
// Must be after all routes
app.use(notFound);
app.use(errorHandler);

// ─── Database Connection & Server Start ──────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════╗
║   AgriAI Disease Detection Server         ║
║   Port: ${PORT}                              ║
║   Mode: ${process.env.NODE_ENV || 'development'}                  ║
║   DB:   Connected ✓                       ║
╚═══════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

startServer();

module.exports = app; // Export for testing