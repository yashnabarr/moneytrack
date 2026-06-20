const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../config/prisma');

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return token;
}

async function issueTokens(userId) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId),
    createRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

async function rotateRefreshToken(oldToken) {
  const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }
  // Delete old token before issuing new one (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });
  return issueTokens(stored.userId);
}

async function revokeRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

module.exports = { issueTokens, rotateRefreshToken, revokeRefreshToken };
