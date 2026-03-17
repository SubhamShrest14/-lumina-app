const express = require('express');
const AngelHistory = require('../models/AngelHistory');
const { protect } = require('../middleware/auth');
const router = express.Router();

// POST /api/angel/log
router.post('/log', protect, async (req, res) => {
  try {
    const { number, meaning, intention } = req.body;
    const entry = await AngelHistory.create({
      userId: req.user._id,
      number,
      meaning,
      intention: intention || ''
    });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/angel/history
router.get('/history', protect, async (req, res) => {
  try {
    const history = await AngelHistory.find({ userId: req.user._id })
      .sort({ firedAt: -1 }).limit(50);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
