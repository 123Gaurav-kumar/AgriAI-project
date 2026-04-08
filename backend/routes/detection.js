/**
 * Detection Routes
 * ─────────────────────────────────────────────────────────────
 * POST /api/detect        → Upload image + trigger AI analysis
 * GET  /api/detect/:id    → Get single detection result
 * DELETE /api/detect/:id  → Delete a detection record
 *
 * This is the CORE feature of the application.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const Detection = require('../models/detection');
const { protect } = require('../middleware/authMiddleware');
const { upload, deleteImage } = require('../utils/cloudinary');
const { analyzeCropImage } = require('../utils/aiAnalysis');
const logger = require('../utils/logger');

const router = express.Router();

// All detection routes require authentication
router.use(protect);

// ─────────────────────────────────────────────────────────────
// POST /api/detect
// Main endpoint: Upload crop image → AI analyzes → Returns results
//
// Request: multipart/form-data with fields:
//   - image (file): The crop image
//   - cropName (string): Name of the crop (e.g., "Tomato")
//   - cropVariety (string, optional): Variety name
//   - growthStage (string, optional): Growth stage
//   - fieldName (string, optional): Name of the field
// ─────────────────────────────────────────────────────────────
router.post(
  '/',
  upload.single('image'), // Multer processes the image, uploads to Cloudinary
  [
    body('cropName')
      .trim()
      .notEmpty()
      .withMessage('Crop name is required')
      .isLength({ max: 50 })
      .withMessage('Crop name too long')
  ],
  async (req, res, next) => {
    try {
      // Check validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      // Check if image was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload an image of your crop.'
        });
      }

      const { cropName, cropVariety, growthStage, fieldName, latitude, longitude } = req.body;

      // Cloudinary details come from req.file after multer-storage-cloudinary processes it
      const imageUrl = req.file.path;      // Cloudinary URL
      const publicId = req.file.filename;  // Cloudinary public ID

      logger.info(`Detection request: User=${req.user._id}, Crop=${cropName}, Image=${imageUrl}`);

      // ─── Create Detection Record (status: processing) ─────
      // We create the record BEFORE AI analysis so we can return the ID
      // and show a loading state in the frontend
      const detection = await Detection.create({
        user: req.user._id,
        image: {
          url: imageUrl,
          publicId,
          filename: req.file.originalname,
          size: req.file.size,
          format: req.file.format
        },
        crop: {
          name: cropName,
          variety: cropVariety || null,
          growthStage: growthStage || 'unknown'
        },
        location: {
          fieldName: fieldName || null,
          latitude: latitude ? parseFloat(latitude) : null,
          longitude: longitude ? parseFloat(longitude) : null
        },
        // Placeholder until AI runs
        analysis: {
          overallStatus: 'uncertain',
          overallConfidence: 0,
          summary: 'Analysis in progress...',
          urgentAction: false
        },
        status: 'processing'
      });

      // ─── Run AI Analysis ───────────────────────────────────
      // This calls Claude API with the image URL
      const aiResult = await analyzeCropImage(imageUrl, cropName);

      // ─── Update Detection with AI Results ─────────────────
      detection.analysis = {
        overallStatus: aiResult.overallStatus,
        overallConfidence: aiResult.overallConfidence,
        primaryDisease: aiResult.primaryDisease,
        urgentAction: aiResult.urgentAction,
        summary: aiResult.summary,
        diseases: aiResult.diseases,
        environmentalFactors: aiResult.environmentalFactors
      };
      detection.treatments = aiResult.treatments;
      detection.preventionTips = aiResult.preventionTips;
      detection.processingTime = aiResult.processingTime;
      detection.status = 'completed';

      await detection.save();

      // ─── Update User Stats ─────────────────────────────────
      const hasDisease = aiResult.overallStatus === 'diseased';
      await req.user.updateStats(hasDisease);

      logger.info(`Detection completed: ${detection._id}, Status: ${aiResult.overallStatus}`);

      res.status(201).json({
        success: true,
        message: 'Analysis complete!',
        data: detection
      });

    } catch (error) {
      // If AI fails, update detection status to 'failed'
      logger.error(`Detection error: ${error.message}`);
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/detect/:id
// Get a single detection result by ID
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const detection = await Detection.findById(req.params.id)
      .populate('user', 'name email avatar');

    if (!detection) {
      return res.status(404).json({
        success: false,
        message: 'Detection record not found.'
      });
    }

    // Users can only view their own detections (admins can view all)
    if (detection.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this detection.'
      });
    }

    res.status(200).json({
      success: true,
      data: detection
    });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/detect/:id/feedback
// Allow user to submit feedback on the detection result
// ─────────────────────────────────────────────────────────────
router.patch('/:id/feedback', async (req, res, next) => {
  try {
    const { isHelpful, comment } = req.body;

    const detection = await Detection.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Detection not found.' });
    }

    detection.feedback = { isHelpful, comment };
    await detection.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { feedback: detection.feedback }
    });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/detect/:id/notes
// Add personal notes to a detection
// ─────────────────────────────────────────────────────────────
router.patch('/:id/notes', async (req, res, next) => {
  try {
    const { notes } = req.body;

    const detection = await Detection.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { userNotes: notes },
      { new: true }
    );

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Detection not found.' });
    }

    res.status(200).json({ success: true, data: { userNotes: detection.userNotes } });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/detect/:id
// Delete a detection record and its image from Cloudinary
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const detection = await Detection.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!detection) {
      return res.status(404).json({ success: false, message: 'Detection not found.' });
    }

    // Delete image from Cloudinary
    if (detection.image.publicId) {
      await deleteImage(detection.image.publicId);
    }

    await detection.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Detection record deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;