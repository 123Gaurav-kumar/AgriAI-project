/**
 * Authentication Middleware
 * ─────────────────────────────────────────────────────────────
 * Protects API routes by validating JWT tokens.
 * Usage: router.get('/protected', protect, handler)
 *
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify JWT signature
 * 3. Look up user in database
 * 4. Attach user to req.user for downstream handlers
 */

const { verifyToken } = require('../utils/token');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Protect middleware — validates JWT and attaches user to request.
 * Add to any route that requires authentication.
 */
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  // Format: "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    // Verify the token is valid and not expired
    const decoded = verifyToken(token);

    // Look up the user in the database
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid, but the user no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Attach user to request — available in all subsequent middleware/handlers
    req.user = user;
    next();

  } catch (error) {
    logger.warn(`Auth failed: ${error.message}`);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }

    return res.status(500).json({ success: false, message: 'Authentication error.' });
  }
};

/**
 * Role-based authorization middleware.
 * Usage: router.delete('/user/:id', protect, authorize('admin'), handler)
 *
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'agronomist')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };