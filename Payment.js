const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail:       { type: String, required: true },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpaySignature: { type: String, default: null },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'INR' },
  plan:            { type: String, default: 'royal_2weeks' },
  status:          { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  paidAt:          { type: Date, default: Date.now },
  expiresAt:       { type: Date, required: true }
});

module.exports = mongoose.model('Payment', paymentSchema);
