const { prisma } = require('../config/prisma');

// Only return fields the frontend actually uses — no userId/createdAt/updatedAt leaking
function serialize(tx) {
  return {
    id:          tx.id,
    type:        tx.type,
    title:       tx.title,
    amount:      parseFloat(tx.amount),
    category:    tx.category,
    date:        tx.date,
    payment:     tx.payment     ?? null,
    description: tx.description ?? null,
  };
}

async function list(req, res, next) {
  try {
    const txs = await prisma.transaction.findMany({
      where:   { userId: req.userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(txs.map(serialize));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { id, type, title, amount, category, date, payment, description } = req.body;
    const tx = await prisma.transaction.create({
      // Accept client-generated id so localStorage ids stay in sync with the DB
      data: { ...(id && { id }), userId: req.userId, type, title, amount, category, date, payment, description },
    });
    res.status(201).json(serialize(tx));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    const { type, title, amount, category, date, payment, description } = req.body;
    const tx = await prisma.transaction.update({
      where: { id: req.params.id },
      data:  { type, title, amount, category, date, payment, description },
    });
    res.json(serialize(tx));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: 'Transaction not found' });

    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
