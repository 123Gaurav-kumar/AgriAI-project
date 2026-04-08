/**
 * Detection Model
 * ─────────────────────────────────────────────────────────────
 * Stores every AI disease detection analysis result.
 * Links to the user who submitted it, the image, and the AI's findings.
 */

const mongoose = require('mongoose');

// Sub-schema for individual disease findings
const diseaseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  confidence: {
    type: Number, // 0 to 100
    required: true,
    min: 0,
    max: 100
  },
  severity: {
    type: String,
    enum: ['none', 'mild', 'moderate', 'severe', 'critical'],
    default: 'none'
  },
  affectedArea: {
    type: String, // e.g., "leaves", "stem", "roots", "fruit"
    default: 'unknown'
  },
  description: String
}, { _id: false });

// Sub-schema for treatment recommendations
const treatmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['chemical', 'biological', 'cultural', 'preventive'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  applicationMethod: String,
  dosage: String,
  frequency: String,
  urgency: {
    type: String,
    enum: ['immediate', 'within_week', 'preventive'],
    default: 'within_week'
  }
}, { _id: false });

// Main Detection Schema
const detectionSchema = new mongoose.Schema(
  {
    // ─── Relations ────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },

    // ─── Image Data ───────────────────────────────────────────
    image: {
      url: {
        type: String,
        required: [true, 'Image URL is required']
      },
      publicId: {
        type: String,
        default: null // Cloudinary public ID for deletion
      },
      filename: String,
      size: Number, // bytes
      format: String // jpg, png, etc.
    },

    // ─── Crop Information ─────────────────────────────────────
    crop: {
      name: {
        type: String,
        required: [true, 'Crop name is required'],
        trim: true
      },
      variety: {
        type: String,
        trim: true,
        default: null
      },
      growthStage: {
        type: String,
        enum: ['seedling', 'vegetative', 'flowering', 'fruiting', 'harvest', 'unknown'],
        default: 'unknown'
      }
    },

    // ─── AI Analysis Results ──────────────────────────────────
    analysis: {
      // Overall health status
      overallStatus: {
        type: String,
        enum: ['healthy', 'diseased', 'stressed', 'uncertain'],
        required: true
      },

      // Primary disease detected (if any)
      primaryDisease: {
        type: String,
        default: null
      },

      // Confidence in the overall analysis (0-100)
      overallConfidence: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },

      // Detailed disease findings
      diseases: [diseaseSchema],

      // Environmental factors mentioned
      environmentalFactors: [String],

      // AI-generated summary
      summary: {
        type: String,
        required: true
      },

      // Immediate action needed?
      urgentAction: {
        type: Boolean,
        default: false
      }
    },

    // ─── Treatment Recommendations ────────────────────────────
    treatments: [treatmentSchema],

    // ─── Prevention Tips ──────────────────────────────────────
    preventionTips: [String],

    // ─── Status & Metadata ────────────────────────────────────
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing'
    },

    processingTime: {
      type: Number, // milliseconds
      default: null
    },

    // User-added notes
    userNotes: {
      type: String,
      maxlength: 500,
      default: null
    },

    // Was this flagged by user as helpful?
    feedback: {
      isHelpful: { type: Boolean, default: null },
      comment: { type: String, default: null }
    },

    // Field location (optional GPS)
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      fieldName: { type: String, default: null }
    },

    // Tags for filtering
    tags: [String]
  },
  {
    timestamps: true // createdAt = detection time, updatedAt = last modified
  }
);

// ─── Indexes for Performance ──────────────────────────────────
detectionSchema.index({ user: 1, createdAt: -1 }); // User's recent detections
detectionSchema.index({ 'analysis.overallStatus': 1 });
detectionSchema.index({ 'crop.name': 1 });
detectionSchema.index({ createdAt: -1 });

// ─── Virtual: Days Since Detection ───────────────────────────
detectionSchema.virtual('daysSince').get(function () {
  const diff = Date.now() - this.createdAt.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

// ─── Static: Get Disease Frequency Stats ─────────────────────
detectionSchema.statics.getDiseaseStats = async function (userId) {
  return this.aggregate([
    { $match: { user: userId, status: 'completed' } },
    { $unwind: { path: '$analysis.diseases', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$analysis.diseases.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
};

// ─── Static: Get Monthly Detection Count ─────────────────────
detectionSchema.statics.getMonthlyCount = async function (userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);
};

const Detection = mongoose.model('Detection', detectionSchema);

module.exports = Detection;