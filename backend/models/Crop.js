/**
 * Crop Model
 * ─────────────────────────────────────────────────────────────
 * Static database of crops and their common diseases.
 * Pre-loaded via seed script. Used for suggestions and validation.
 */

const mongoose = require('mongoose');

const cropSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Crop name is required'],
      unique: true,
      trim: true,
      lowercase: true
    },

    displayName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      enum: ['cereal', 'vegetable', 'fruit', 'legume', 'oilseed', 'fiber', 'spice', 'plantation'],
      required: true
    },

    // Common diseases that affect this crop
    commonDiseases: [{
      name: { type: String, required: true },
      pathogen: String, // e.g., "Fungal", "Bacterial", "Viral"
      season: String,   // e.g., "Kharif", "Rabi", "All year"
      symptoms: [String],
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'very_high']
      }
    }],

    // Growing seasons in India
    growingSeasons: [{
      type: String,
      enum: ['Kharif', 'Rabi', 'Zaid', 'Perennial']
    }],

    // States where commonly grown in India
    majorStates: [String],

    // Image for UI display
    image: {
      type: String,
      default: null
    },

    // Is this crop available in the dropdown?
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// cropSchema.index({ name: 1 });
cropSchema.index({ category: 1 });

const Crop = mongoose.model('Crop', cropSchema);

module.exports = Crop;