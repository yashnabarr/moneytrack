const { prisma } = require('../config/prisma');

function serialize(g) {
  return {
    id:     g.id,
    name:   g.name,
    icon:   g.icon,
    target: parseFloat(g.target),
    saved:  parseFloat(g.saved),
    date:   g.date  ?? null,
    color:  g.color,
  };
}

async function list(req, res, next) {
  try {
    const goals = await prisma.goal.findMany({ where: { userId: req.userId } });
    res.json(goals.map(serialize));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { id, name, icon, target, saved, date, color } = req.body;
    const goal = await prisma.goal.create({
      data: { ...(id && { id }), userId: req.userId, name, icon, target, saved: saved || 0, date, color },
    });
    res.status(201).json(serialize(goal));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    const { name, icon, target, saved, date, color } = req.body;
    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data:  { name, icon, target, saved, date, color },
    });
    res.json(serialize(goal));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Goal not found' });

    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

async function addFunds(req, res, next) {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const updated = await prisma.goal.update({
      where: { id: req.params.id },
      data:  { saved: parseFloat(goal.saved) + parseFloat(req.body.amount) },
    });
    res.json(serialize(updated));
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, addFunds };
