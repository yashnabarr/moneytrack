require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const passport = require('./config/passport');

const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes      = require('./routes/budgets');
const goalRoutes        = require('./routes/goals');
const userRoutes        = require('./routes/user');
const { authenticate }  = require('./middleware/auth');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow server-to-server and same-origin requests (no Origin header)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(Object.assign(new Error(`CORS: origin ${origin} not allowed`), { status: 403 }));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Passport (stateless — no sessions) ───────────────────────────────────────
app.use(passport.initialize());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',         authRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);
app.use('/api/budgets',      authenticate, budgetRoutes);
app.use('/api/goals',        authenticate, goalRoutes);
app.use('/api/user',         authenticate, userRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  // Surface Prisma unique-constraint violations cleanly
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
