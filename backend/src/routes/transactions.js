const router   = require('express').Router();
const { body } = require('express-validator');
const { handle } = require('../middleware/validate');
const ctrl       = require('../controllers/transactions');

const INCOME_CATS  = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other Income'];
const EXPENSE_CATS = ['Groceries', 'Dining', 'Transport', 'Utilities', 'Shopping',
                      'Entertainment', 'Health', 'Rent', 'Other'];
const ALL_CATEGORIES = [...INCOME_CATS, ...EXPENSE_CATS];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'UPI', 'Other'];

const txRules = [
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title must be 200 characters or fewer'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('category').isIn(ALL_CATEGORIES).withMessage('Invalid category'),
  // Cross-field check: income categories only on income, expense on expense
  body('category').custom((cat, { req }) => {
    if (req.body.type === 'income'  && !INCOME_CATS.includes(cat))  throw new Error('Income type requires an income category');
    if (req.body.type === 'expense' && !EXPENSE_CATS.includes(cat)) throw new Error('Expense type requires an expense category');
    return true;
  }),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
  body('payment').optional({ checkFalsy: true }).isIn(PAYMENT_METHODS).withMessage('Invalid payment method'),
  body('description').optional({ checkFalsy: true }).isString()
    .isLength({ max: 2000 }).withMessage('Description must be 2000 characters or fewer'),
];

router.get('/',       ctrl.list);
router.post('/',      txRules, handle, ctrl.create);
router.put('/:id',   txRules, handle, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
