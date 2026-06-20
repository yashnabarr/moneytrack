const bcrypt = require('bcrypt');
const { prisma } = require('../config/prisma');
const { issueTokens, rotateRefreshToken, revokeRefreshToken } = require('../utils/tokens');

const SALT_ROUNDS = 10;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, countryCode: user.countryCode };
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    const tokens = await issueTokens(user.id);

    res.status(201).json({ user: publicUser(user), ...tokens });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    // Deliberately vague error — don't leak whether the email exists
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const tokens = await issueTokens(user.id);
    res.json({ user: publicUser(user), ...tokens });
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

    const tokens = await rotateRefreshToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message });
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
}

// Called by Passport after successful Google OAuth — req.user is set
async function googleCallback(req, res) {
  try {
    const tokens = await issueTokens(req.user.id);
    const url = new URL(process.env.FRONTEND_URL);
    url.searchParams.set('access_token', tokens.accessToken);
    url.searchParams.set('refresh_token', tokens.refreshToken);
    res.redirect(url.toString());
  } catch {
    res.redirect(`${process.env.FRONTEND_URL}?error=oauth_failed`);
  }
}

module.exports = { register, login, refresh, logout, googleCallback };
