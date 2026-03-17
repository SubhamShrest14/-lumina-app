# ✦ LUMINA — Spiritual Manifestation App
## Full Stack: Node.js + Express + MongoDB + Razorpay

---

## QUICK START (3 steps)

### Step 1 — Get your MongoDB connection string
1. Go to https://cloud.mongodb.com → Sign up free
2. Create a new project → Create a free cluster (M0)
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/)
5. Replace <password> with your actual password

### Step 2 — Set up your .env file
1. Copy `.env.example` to `.env`
2. Paste your MongoDB URI
3. Add your Razorpay Key Secret (from Razorpay Dashboard → Settings → API Keys)
4. Set ADMIN_EMAIL to your own email address

```
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster0.xxxxx.mongodb.net/lumina
JWT_SECRET=lumina_super_secret_change_this_123
RAZORPAY_KEY_ID=rzp_live_SOSO5Va9RoNg6I
RAZORPAY_KEY_SECRET=YOUR_SECRET_HERE
ADMIN_EMAIL=your@email.com
PORT=3000
```

### Step 3 — Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

---

## DEPLOY TO RENDER (free hosting)

1. Go to https://render.com → Sign up free
2. Click "New Web Service"
3. Upload this folder OR connect your GitHub repo
4. Set these environment variables in Render dashboard:
   - MONGODB_URI
   - JWT_SECRET
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - ADMIN_EMAIL
5. Build command: `npm install`
6. Start command: `npm start`
7. Click Deploy → your app goes live at https://your-app.onrender.com

---

## FILE STRUCTURE
```
lumina/
├── server.js          ← Main Express server
├── package.json       ← Dependencies
├── .env.example       ← Copy to .env and fill in
├── middleware/
│   └── auth.js        ← JWT authentication
├── models/
│   ├── User.js        ← User accounts
│   ├── Payment.js     ← Payment records
│   ├── Journal.js     ← 369 journal entries
│   └── AngelHistory.js← Angel number history
├── routes/
│   ├── auth.js        ← Login, register, me
│   ├── payment.js     ← Razorpay verify + history
│   ├── journal.js     ← Save/get journal
│   ├── angel.js       ← Log angel moments
│   └── admin.js       ← Admin stats + users
└── public/
    └── index.html     ← Full frontend app
```

## API ENDPOINTS
| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |
| POST | /api/payment/create-order | Create Razorpay order |
| POST | /api/payment/verify | Verify & save payment |
| GET  | /api/payment/history | User's payments |
| GET  | /api/journal/:date | Get journal for date |
| POST | /api/journal/save | Save journal entry |
| POST | /api/angel/log | Log angel moment |
| GET  | /api/angel/history | Angel history |
| GET  | /api/admin/stats | Admin stats |
| GET  | /api/admin/users | All users |
| GET  | /api/admin/payments | All payments |
