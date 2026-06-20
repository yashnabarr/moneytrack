const { prisma } = require('../config/prisma');

function serialize(b) {
  return { id: b.id, category: b.category, limit: parseFloat(b.limitAmount) };
}

async function list(req, res, next) {
  try {
    const budgets = await prisma.budget.findMany({ where: { userId: req.userId } });
    res.json(budgets.map(serialize));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { id, category, limit } = req.body;

    const existing = await prisma.budget.findFirst({ where: { userId: req.userId, category } });
    if (existing) return res.status(409).json({ error: 'Budget for this category already exists' });

    const budget = await prisma.budget.create({
      data: { ...(id && { id }), userId: req.userId, category, limitAmount: limit },
    });
    res.status(201).json(serialize(budget));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    const budget = await prisma.budget.update({
      where: { id: req.params.id },
      data:  { category: req.body.category, limitAmount: req.body.limit },
    });
    res.json(serialize(budget));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Budget not found' });

    await prisma.budget.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
