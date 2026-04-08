/**
 * User Model
 * ─────────────────────────────────────────────────────────────
 * Defines the schema for farmer/user accounts.
 * Includes authentication fields, profile data, and usage stats.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ─── Identity ─────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include in queries by default
    },

    // ─── Profile ──────────────────────────────────────────────
    avatar: {
      type: String,
      default: null // Cloudinary URL
    },

    phone: {
      type: String,
      trim: true,
      default: null
    },

    location: {
      state: { type: String, default: null },
      district: { type: String, default: null },
      pincode: { type: String, default: null }
    },

    farmDetails: {
      farmName: { type: String, default: null },
      farmSize: { type: Number, default: null }, // in acres
      primaryCrops: [{ type: String }]
    },

    // ─── Role & Status ────────────────────────────────────────
    role: {
      type: String,
      enum: ['farmer', 'agronomist', 'admin'],
      default: 'farmer'
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // ─── Usage Statistics ─────────────────────────────────────
    stats: {
      totalDetections: { type: Number, default: 0 },
      diseasesFound: { type: Number, default: 0 },
      healthyCrops: { type: Number, default: 0 },
      lastActive: { type: Date, default: Date.now }
    },

    // ─── Auth Tokens ──────────────────────────────────────────
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    verificationToken: String
  },
  {
    timestamps: true, // Adds createdAt & updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ─── Virtual Fields ───────────────────────────────────────────
// Computed field - not stored in DB
userSchema.virtual('detectionHistory', {
  ref: 'Detection',
  localField: '_id',
  foreignField: 'user',
  justOne: false
});

// ─── Pre-save Hook: Hash Password ─────────────────────────────
// Runs before every save() call
userSchema.pre('save', async function (next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12); // 12 rounds = strong security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Instance Method: Compare Password ───────────────────────
// Called during login to verify password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ─── Instance Method: Update Stats ───────────────────────────
userSchema.methods.updateStats = async function (hasDisease) {
  this.stats.totalDetections += 1;
  if (hasDisease) {
    this.stats.diseasesFound += 1;
  } else {
    this.stats.healthyCrops += 1;
  }
  this.stats.lastActive = new Date();
  await this.save();
};

// ─── Static Method: Find Active Users ────────────────────────
userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

// ─── Index for Performance ────────────────────────────────────
// userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;