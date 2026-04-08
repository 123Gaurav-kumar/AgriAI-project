/**
 * User Routes
 * ─────────────────────────────────────────────────────────────
 * GET    /api/user/profile        → Get user profile
 * PUT    /api/user/profile        → Update user profile
 * PUT    /api/user/change-password → Change password
 * DELETE /api/user/account        → Delete account
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const Detection = require('../models/detection');
const { protect } = require('../middleware/authMiddleware');
const { upload, deleteImage } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const router = express.Router();
router.use(protect);

// GET /api/user/profile
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/profile - Update name, phone, location, farmDetails
router.put('/profile', async (req, res, next) => {
  try {
    const { name, phone, location, farmDetails } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(location && { location }),
        ...(farmDetails && { farmDetails })
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/avatar - Upload profile picture
router.put('/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded.' });
    }

    // Delete old avatar if exists
    const user = await User.findById(req.user._id);
    if (user.avatarPublicId) {
      await deleteImage(user.avatarPublicId);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.file.path, avatarPublicId: req.file.filename },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Avatar updated!',
      data: { avatar: updatedUser.avatar }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/change-password
router.put(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters')
      .matches(/\d/)
      .withMessage('New password must contain a number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }

      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);
      res.status(200).json({ success: true, message: 'Password changed successfully.' });

    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/user/account - Permanently delete account
router.delete('/account', async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      }
    }

    // Delete all detections
    await Detection.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);

    logger.info(`Account deleted: ${user.email}`);
    res.status(200).json({ success: true, message: 'Account deleted successfully.' });

  } catch (error) {
    next(error);
  }
});

module.exports = router;