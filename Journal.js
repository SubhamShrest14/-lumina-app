const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: String, required: true },
  morning:   { type: String, default: '' },
  afternoon: { type: [Boolean], default: [false,false,false,false,false,false] },
  night:     { type: [Boolean], default: [false,false,false,false,false,false,false,false,false] },
  sealed:    { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

journalSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Journal', journalSchema);
