const mongoose = require('mongoose');

const angelHistorySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  number:    { type: String, required: true },
  meaning:   { type: String, required: true },
  intention: { type: String, default: '' },
  firedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('AngelHistory', angelHistorySchema);
