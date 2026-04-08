/**
 * Cloudinary Configuration
 * ─────────────────────────────────────────────────────────────
 * Cloudinary is a cloud service for storing and transforming images.
 * Free tier gives 25GB storage — perfect for this project.
 *
 * HOW TO SET UP:
 * 1. Sign up at https://cloudinary.com (free)
 * 2. Go to Dashboard → copy Cloud Name, API Key, API Secret
 * 3. Add them to your .env file
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set up Multer to automatically upload to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'agri-disease-detection', // Folder in your Cloudinary account
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], // Accepted file types
    transformation: [
      {
        width: 1024,
        height: 1024,
        crop: 'limit', // Don't upscale, just limit max dimensions
        quality: 'auto' // Cloudinary auto-optimizes quality
      }
    ]
  }
});

// Multer middleware for single file upload
// Field name in the form must be "image"
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

/**
 * Delete an image from Cloudinary by its public ID.
 * Called when a detection record is deleted.
 *
 * @param {string} publicId - Cloudinary public ID of the image
 */
const deleteImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = { cloudinary, upload, deleteImage };