/**
 * Error Handling Middleware
 * ─────────────────────────────────────────────────────────────
 * Centralized error handling for the entire Express app.
 * Catches errors from all route handlers and returns consistent JSON.
 */

const logger = require('../utils/logger');

/**
 * 404 Not Found handler.
 * Triggered when no route matches the request URL.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global error handler.
 * Handles all errors passed via next(error) or thrown in async handlers.
 *
 * Returns consistent error format:
 * { success: false, message: "...", stack: "..." (dev only) }
 */
const errorHandler = (err, req, res, next) => {
  // Default to 500 if status code wasn't set
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Log the error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);

  // ─── Handle Specific Error Types ─────────────────────────

  // MongoDB: Invalid ID format
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: "${err.value}"`;
  }

  // MongoDB: Duplicate unique field
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists. Please use a different value.`;
  }

  // Mongoose: Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join('. ');
  }

  // Multer: File too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Image file is too large. Maximum size is 5MB.';
  }

  // Multer: Wrong file type
  if (err.message === 'Only image files are allowed!') {
    statusCode = 400;
    message = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { notFound, errorHandler };