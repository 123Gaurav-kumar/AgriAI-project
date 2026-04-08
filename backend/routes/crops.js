/**
 * Crops Routes
 * ─────────────────────────────────────────────────────────────
 * GET /api/crops → List all available crops for dropdown
 */

const express = require('express');
const Crop = require('../models/Crop');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Common Indian crops (hardcoded as fallback if DB is empty)
const DEFAULT_CROPS = [
  { name: 'tomato', displayName: 'Tomato', category: 'vegetable' },
  { name: 'rice', displayName: 'Rice / Paddy', category: 'cereal' },
  { name: 'wheat', displayName: 'Wheat', category: 'cereal' },
  { name: 'cotton', displayName: 'Cotton', category: 'fiber' },
  { name: 'maize', displayName: 'Maize / Corn', category: 'cereal' },
  { name: 'potato', displayName: 'Potato', category: 'vegetable' },
  { name: 'onion', displayName: 'Onion', category: 'vegetable' },
  { name: 'sugarcane', displayName: 'Sugarcane', category: 'plantation' },
  { name: 'soybean', displayName: 'Soybean', category: 'legume' },
  { name: 'groundnut', displayName: 'Groundnut / Peanut', category: 'oilseed' },
  { name: 'chilli', displayName: 'Chilli / Pepper', category: 'spice' },
  { name: 'brinjal', displayName: 'Brinjal / Eggplant', category: 'vegetable' },
  { name: 'cauliflower', displayName: 'Cauliflower', category: 'vegetable' },
  { name: 'cabbage', displayName: 'Cabbage', category: 'vegetable' },
  { name: 'mango', displayName: 'Mango', category: 'fruit' },
  { name: 'banana', displayName: 'Banana', category: 'fruit' },
  { name: 'grapes', displayName: 'Grapes', category: 'fruit' },
  { name: 'pomegranate', displayName: 'Pomegranate', category: 'fruit' },
  { name: 'mustard', displayName: 'Mustard', category: 'oilseed' },
  { name: 'chickpea', displayName: 'Chickpea / Chana', category: 'legume' },
  { name: 'lentil', displayName: 'Lentil / Dal', category: 'legume' },
  { name: 'turmeric', displayName: 'Turmeric', category: 'spice' },
  { name: 'ginger', displayName: 'Ginger', category: 'spice' },
  { name: 'sunflower', displayName: 'Sunflower', category: 'oilseed' },
  { name: 'cucumber', displayName: 'Cucumber', category: 'vegetable' },
  { name: 'okra', displayName: 'Okra / Bhindi', category: 'vegetable' }
];

// GET /api/crops - Get all crops for the dropdown
router.get('/', async (req, res, next) => {
  try {
    let crops;

    try {
      crops = await Crop.find({ isActive: true })
        .select('name displayName category commonDiseases')
        .sort('displayName');
    } catch (dbError) {
      crops = [];
    }

    // If DB is empty, use defaults
    if (!crops || crops.length === 0) {
      crops = DEFAULT_CROPS;
    }

    // Group by category for organized dropdown
    const grouped = crops.reduce((acc, crop) => {
      const category = crop.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push({
        value: crop.name,
        label: crop.displayName,
        diseases: crop.commonDiseases?.map(d => d.name) || []
      });
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        crops: crops.map(c => ({ value: c.name, label: c.displayName })),
        grouped
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;