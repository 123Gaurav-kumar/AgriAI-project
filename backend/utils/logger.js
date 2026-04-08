/**
 * Logger Utility
 * ─────────────────────────────────────────────────────────────
 * Winston-based logging. Logs to console in dev, files in production.
 * Log levels: error > warn > info > debug
 */

const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format: [2024-01-01 12:00:00] INFO: Message
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Captures error stack traces
    logFormat
  ),
  transports: [
    // Always log to console
    new winston.transports.Console({
      format: combine(
        colorize(), // Colors in terminal
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      )
    }),

    // In production, also log to files
    ...(process.env.NODE_ENV === 'production' ? [
      // Error-only log
      new winston.transports.File({
        filename: path.join(__dirname, '../logs/error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      // Combined log
      new winston.transports.File({
        filename: path.join(__dirname, '../logs/combined.log'),
        maxsize: 5242880,
        maxFiles: 5
      })
    ] : [])
  ]
});

module.exports = logger;