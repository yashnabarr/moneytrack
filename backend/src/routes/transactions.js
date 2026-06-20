const router   = require('express').Router();
const { body } = require('express-validator');
const { handle } = require('../middleware/validate');
const ctrl       = require('../controllers/transactions');

const ALL_CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Gift', 'Other Income',
  'Groceries', 'Dining', 'Transport', 'Utilities', 'Shopping',
  'Entertainment', 'Health', 'Rent', 'Other',
];

const txRules = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('category').isIn(ALL_CATEGORIES).withMessage('Invalid category'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
  body('payment').optional().isString(),
  body('description').optional().isString(),
];

router.get('/',       ctrl.list);
router.post('/',      txRules, handle, ctrl.create);
router.put('/:id',   txRules, handle, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
