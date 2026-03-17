require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const cors = require('cors');
const path = require('path');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ══ MONGOOSE CONNECT ══
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✦ MongoDB connected'))
  .catch(err => { console.error('MongoDB error:', err); process.exit(1); });

// ══ MODELS ══
const userSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, lowercase: true },
  password:    { type: String, required: true },
  isRoyal:     { type: Boolean, default: false },
  royalExpiry: { type: Date, default: null },
  totalPaid:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
  lastLogin:   { type: Date, default: null }
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
userSchema.methods.comparePassword = async function(p) {
  return await bcrypt.compare(p, this.password);
};
const User = mongoose.model('User', userSchema);

const paymentSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail:         { type: String, required: true },
  razorpayOrderId:   { type: String, default: null },
  razorpayPaymentId: { type: String, required: true, unique: true },
  razorpaySignature: { type: String, default: null },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  plan:              { type: String, default: 'royal_2weeks' },
  status:            { type: String, default: 'success' },
  paidAt:            { type: Date, default: Date.now },
  expiresAt:         { type: Date, required: true }
});
const Payment = mongoose.model('Payment', paymentSchema);

const journalSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: String, required: true },
  morning:   { type: String, default: '' },
  afternoon: { type: [Boolean], default: [false,false,false,false,false,false] },
  night:     { type: [Boolean], default: [false,false,false,false,false,false,false,false,false] },
  sealed:    { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
});
journalSchema.index({ userId: 1, date: 1 }, { unique: true });
const Journal = mongoose.model('Journal', journalSchema);

const angelSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  number:    { type: String, required: true },
  meaning:   { type: String, required: true },
  intention: { type: String, default: '' },
  firedAt:   { type: Date, default: Date.now }
});
const AngelHistory = mongoose.model('AngelHistory', angelSchema);

// ══ AUTH MIDDLEWARE ══
const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1] : null;
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    if (req.user.isRoyal && req.user.royalExpiry && new Date() > req.user.royalExpiry) {
      req.user.isRoyal = false;
      await req.user.save();
    }
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.email !== process.env.ADMIN_EMAIL)
    return res.status(403).json({ success: false, message: 'Admin only' });
  next();
};

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ══ AUTH ROUTES ══
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ success: true, token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, isRoyal: user.isRoyal, royalExpiry: user.royalExpiry } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    user.lastLogin = new Date(); await user.save();
    res.json({ success: true, token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, isRoyal: user.isRoyal, royalExpiry: user.royalExpiry, totalPaid: user.totalPaid } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/auth/me', protect, (req, res) => {
  res.json({ success: true, user: { id: req.user._id, name: req.user.name, email: req.user.email, isRoyal: req.user.isRoyal, royalExpiry: req.user.royalExpiry, totalPaid: req.user.totalPaid, createdAt: req.user.createdAt } });
});

// ══ PAYMENT ROUTES ══
const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

app.post('/api/payment/create-order', protect, async (req, res) => {
  try {
    const order = await razorpay.orders.create({ amount: 2200, currency: 'INR', receipt: `lumina_${req.user._id}_${Date.now()}` });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/payment/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + 14);
    await Payment.create({ userId: req.user._id, userEmail: req.user.email, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, amount: 22, expiresAt });
    await User.findByIdAndUpdate(req.user._id, { isRoyal: true, royalExpiry: expiresAt, $inc: { totalPaid: 22 } });
    res.json({ success: true, message: 'Payment verified', expiresAt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/payment/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ paidAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ══ JOURNAL ROUTES ══
app.get('/api/journal/:date', protect, async (req, res) => {
  try {
    const journal = await Journal.findOne({ userId: req.user._id, date: req.params.date });
    res.json({ success: true, journal: journal || null });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/journal/save', protect, async (req, res) => {
  try {
    if (!req.user.isRoyal) return res.status(403).json({ success: false, message: 'Royal Access required' });
    const { date, morning, afternoon, night, sealed } = req.body;
    const journal = await Journal.findOneAndUpdate({ userId: req.user._id, date }, { morning, afternoon, night, sealed, updatedAt: new Date() }, { upsert: true, new: true });
    res.json({ success: true, journal });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ══ ANGEL ROUTES ══
app.post('/api/angel/log', protect, async (req, res) => {
  try {
    const entry = await AngelHistory.create({ userId: req.user._id, number: req.body.number, meaning: req.body.meaning, intention: req.body.intention || '' });
    res.json({ success: true, entry });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/angel/history', protect, async (req, res) => {
  try {
    const history = await AngelHistory.find({ userId: req.user._id }).sort({ firedAt: -1 }).limit(50);
    res.json({ success: true, history });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ══ ADMIN ROUTES ══
app.get('/api/admin/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalUsers, royalUsers, totalPayments, revenueData] = await Promise.all([
      User.countDocuments(), User.countDocuments({ isRoyal: true }),
      Payment.countDocuments({ status: 'success' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    res.json({ success: true, stats: { totalUsers, royalUsers, totalPayments, totalRevenue: revenueData[0]?.total || 0 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/payments', protect, adminOnly, async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'success' }).populate('userId', 'name email').sort({ paidAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ══ SERVE FRONTEND ══
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✦ Lumina running on port ${PORT}`));
