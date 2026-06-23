require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const passport = require('./config/passport');

const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes      = require('./routes/budgets');
const goalRoutes        = require('./routes/goals');
const userRoutes        = require('./routes/user');
const { authenticate }  = require('./middleware/auth');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
// Helmet sets a reasonable set of defaults: X-Content-Type-Options, X-Frame-Options,
// Strict-Transport-Security, Referrer-Policy, etc. CSP is left to Vercel's defaults
// since this API only serves JSON (no HTML).
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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
// Explicit limit so a single bad request can't tie up the function with a 100MB body.
app.use(express.json({ limit: '64kb' }));

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
  // Always log full error server-side for debugging
  console.error('[error]', err);

  // Prisma unique-constraint
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }

  const status = err.status || 500;
  // For 4xx (validation, CORS, etc.) the message is safe to surface to the client.
  // For 5xx we must NOT leak internals (DB structure, file paths, stack traces).
  const message = status < 500
    ? (err.message || 'Request failed')
    : 'Internal server error';

  res.status(status).json({ error: message });
});

module.exports = app;
