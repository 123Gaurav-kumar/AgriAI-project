/**
 * Authentication Routes
 * ─────────────────────────────────────────────────────────────
 * POST /api/auth/register  → Create a new account
 * POST /api/auth/login     → Login and get JWT token
 * GET  /api/auth/me        → Get current user (requires auth)
 * POST /api/auth/logout    → Logout (client-side token removal)
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { generateToken } = require('../utils/token');
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Helper: Handle Validation Errors ────────────────────────
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg, // Return first error
      errors: errors.array()
    });
  }
  return null;
};

// ─── Helper: Build User Response ─────────────────────────────
// Strips sensitive fields, adds token
const buildAuthResponse = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  phone: user.phone,
  location: user.location,
  farmDetails: user.farmDetails,
  stats: user.stats,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  token
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Register a new farmer account
// ─────────────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),

    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),

    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
  ],
  async (req, res, next) => {
    try {
      // Check validation
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      const { name, email, password, phone, location, farmDetails } = req.body;

      // Check if email already registered
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.'
        });
      }

      // Create the user (password hashed automatically via pre-save hook)
      const user = await User.create({
        name,
        email,
        password,
        phone: phone || null,
        location: location || {},
        farmDetails: farmDetails || {}
      });

      // Generate JWT
      const token = generateToken(user._id);

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to AgriAI.',
        data: buildAuthResponse(user, token)
      });

    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Login with email + password, returns JWT
// ─────────────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res, next) => {
    try {
      const validationError = handleValidationErrors(req, res);
      if (validationError) return;

      const { email, password } = req.body;

      // Find user and explicitly include the hashed password field
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Compare provided password with stored hash
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
      }

      // Update last active timestamp
      user.stats.lastActive = new Date();
      await user.save();

      const token = generateToken(user._id);

      logger.info(`User logged in: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Login successful!',
        data: buildAuthResponse(user, token)
      });

    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  [Protected]
// Get the currently authenticated user's profile
// ─────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res, next) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: buildAuthResponse(user, null) // No new token needed
    });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// JWT is stateless — logout is handled client-side by removing token.
// This endpoint just provides a consistent API surface.
// ─────────────────────────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please remove the token from local storage.'
  });
});

module.exports = router;