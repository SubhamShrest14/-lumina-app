const express = require('express');
const Journal = require('../models/Journal');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/journal/:date
router.get('/:date', protect, async (req, res) => {
  try {
    const journal = await Journal.findOne({ userId: req.user._id, date: req.params.date });
    res.json({ success: true, journal: journal || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/journal/save
router.post('/save', protect, async (req, res) => {
  try {
    if (!req.user.isRoyal)
      return res.status(403).json({ success: false, message: 'Royal Access required' });

    const { date, morning, afternoon, night, sealed } = req.body;
    const journal = await Journal.findOneAndUpdate(
      { userId: req.user._id, date },
      { morning, afternoon, night, sealed, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, journal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/journal/all
router.get('/', protect, async (req, res) => {
  try {
    const journals = await Journal.find({ userId: req.user._id }).sort({ date: -1 }).limit(30);
    res.json({ success: true, journals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
