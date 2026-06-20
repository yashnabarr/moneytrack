const { PrismaClient } = require('@prisma/client');

// Prevent multiple PrismaClient instances during hot-reloads in development
// and between warm Lambda invocations in production.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = { prisma };
