const express = require('express');
const User = require('../models/User');
const Payment = require('../models/Payment');
const AngelHistory = require('../models/AngelHistory');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// All admin routes require login + admin email
router.use(protect, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, royalUsers, totalPayments, revenueData] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isRoyal: true }),
      Payment.countDocuments({ status: 'success' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    const totalRevenue = revenueData[0]?.total || 0;
    res.json({ success: true, stats: { totalUsers, royalUsers, totalPayments, totalRevenue } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'success' })
      .populate('userId', 'name email')
      .sort({ paidAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/revenue-chart
router.get('/revenue-chart', async (req, res) => {
  try {
    const data = await Payment.aggregate([
      { $match: { status: 'success' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } },
        revenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
