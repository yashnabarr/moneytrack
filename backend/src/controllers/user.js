const { prisma } = require('../config/prisma');

async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.userId },
      select: { id: true, name: true, email: true, countryCode: true, googleId: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
}

async function updateProfile(req, res, next) {
  try {
    const data = {};
    if (req.body.name)        data.name        = req.body.name;
    if (req.body.countryCode) data.countryCode = req.body.countryCode;

    const user = await prisma.user.update({
      where:  { id: req.userId },
      data,
      select: { id: true, name: true, email: true, countryCode: true },
    });
    res.json(user);
  } catch (err) { next(err); }
}

// Single endpoint the frontend calls immediately after login to hydrate localStorage
async function getAllData(req, res, next) {
  try {
    const [transactions, budgets, goals] = await Promise.all([
      prisma.transaction.findMany({
        where:   { userId: req.userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.budget.findMany({ where: { userId: req.userId } }),
      prisma.goal.findMany({ where: { userId: req.userId } }),
    ]);

    res.json({
      transactions: transactions.map(t => ({
        id: t.id, type: t.type, title: t.title,
        amount: parseFloat(t.amount), category: t.category,
        date: t.date, payment: t.payment ?? null, description: t.description ?? null,
      })),
      budgets: budgets.map(b => ({
        id: b.id, category: b.category, limit: parseFloat(b.limitAmount),
      })),
      goals: goals.map(g => ({
        id: g.id, name: g.name, icon: g.icon,
        target: parseFloat(g.target), saved: parseFloat(g.saved),
        date: g.date ?? null, color: g.color,
      })),
    });
  } catch (err) { next(err); }
}

// Wipe all app data without deleting the account
async function clearData(req, res, next) {
  try {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId: req.userId } }),
      prisma.budget.deleteMany({ where: { userId: req.userId } }),
      prisma.goal.deleteMany({ where: { userId: req.userId } }),
    ]);
    res.json({ message: 'All data cleared' });
  } catch (err) { next(err); }
}

module.exports = { getProfile, updateProfile, getAllData, clearData };
