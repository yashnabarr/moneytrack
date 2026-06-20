const rateLimit = require('express-rate-limit');

// Applied to all auth mutation routes (register, login)
// Note: per-instance only on Vercel — add Upstash Redis for global limits
const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 minutes
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: 'Too many requests — please try again in 15 minutes' },
});

module.exports = { authLimiter };
