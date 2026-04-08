/**
 * History Routes
 * ─────────────────────────────────────────────────────────────
 * GET /api/history         → Get all detections for current user (paginated)
 * GET /api/history/stats   → Get detection statistics & charts data
 * GET /api/history/recent  → Get last 5 detections
 */

const express = require('express');
const Detection = require('../models/detection');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

// ─────────────────────────────────────────────────────────────
// GET /api/history
// Paginated detection history for the current user
// Query params: page, limit, status, crop, startDate, endDate
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,          // Filter by: healthy|diseased|stressed|uncertain
      crop,            // Filter by crop name
      startDate,
      endDate
    } = req.query;

    // Build MongoDB filter
    const filter = { user: req.user._id };

    if (status) filter['analysis.overallStatus'] = status;
    if (crop) filter['crop.name'] = { $regex: crop, $options: 'i' }; // Case-insensitive

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Detection.countDocuments(filter);

    const detections = await Detection.find(filter)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit))
      .select('-treatments -preventionTips'); // Exclude heavy fields from list view

    res.status(200).json({
      success: true,
      data: {
        detections,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
          hasMore: skip + detections.length < total
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/history/stats
// Returns stats for dashboard charts and overview widgets
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Run all stats queries in parallel for performance
    const [
      totalCount,
      statusBreakdown,
      cropBreakdown,
      monthlyData,
      diseaseFrequency,
      recentActivity
    ] = await Promise.all([
      // Total detections
      Detection.countDocuments({ user: userId }),

      // Count by health status
      Detection.aggregate([
        { $match: { user: userId, status: 'completed' } },
        { $group: { _id: '$analysis.overallStatus', count: { $sum: 1 } } }
      ]),

      // Top 5 crops analyzed
      Detection.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$crop.name', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Monthly detection count (last 6 months)
      Detection.aggregate([
        {
          $match: {
            user: userId,
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Most frequently detected diseases
      Detection.getDiseaseStats(userId),

      // Last 5 detections for activity feed
      Detection.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('crop.name analysis.overallStatus analysis.primaryDisease createdAt image.url')
    ]);

    // Format status breakdown as a map
    const statusMap = { healthy: 0, diseased: 0, stressed: 0, uncertain: 0 };
    statusBreakdown.forEach(s => { statusMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: totalCount,
          healthy: statusMap.healthy,
          diseased: statusMap.diseased,
          stressed: statusMap.stressed,
          uncertain: statusMap.uncertain,
          diseaseRate: totalCount > 0
            ? Math.round((statusMap.diseased / totalCount) * 100)
            : 0
        },
        topCrops: cropBreakdown.map(c => ({ name: c._id, count: c.count })),
        monthlyTrend: monthlyData.map(m => ({
          label: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
          count: m.count
        })),
        topDiseases: diseaseFrequency.map(d => ({ name: d._id, count: d.count })),
        recentActivity
      }
    });

  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/history/recent
// Get last 5 detections for the dashboard widget
// ─────────────────────────────────────────────────────────────
router.get('/recent', async (req, res, next) => {
  try {
    const detections = await Detection.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('crop.name analysis.overallStatus analysis.primaryDisease analysis.overallConfidence createdAt image.url status');

    res.status(200).json({ success: true, data: detections });

  } catch (error) {
    next(error);
  }
});

module.exports = router;