/**
 * Token Utility
 * ─────────────────────────────────────────────────────────────
 * Handles JWT (JSON Web Token) generation and verification.
 * JWTs are used to authenticate API requests after login.
 */

const jwt = require('jsonwebtoken');

/**
 * Generate a signed JWT for a given user ID.
 * The token is valid for the period set in JWT_EXPIRE env var.
 *
 * @param {string} userId - MongoDB user ID
 * @returns {string} Signed JWT string
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },                    // Payload
    process.env.JWT_SECRET,            // Secret key
    { expiresIn: process.env.JWT_EXPIRE || '7d' } // Options
  );
};

/**
 * Verify a JWT and return the decoded payload.
 *
 * @param {string} token - JWT string
 * @returns {object} Decoded payload { id, iat, exp }
 * @throws {JsonWebTokenError} If token is invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };