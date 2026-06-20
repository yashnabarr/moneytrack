const router   = require('express').Router();
const { body } = require('express-validator');
const { handle } = require('../middleware/validate');
const ctrl       = require('../controllers/budgets');

const EXPENSE_CATS = [
  'Groceries', 'Dining', 'Transport', 'Utilities', 'Shopping',
  'Entertainment', 'Health', 'Rent', 'Other',
];

const budgetRules = [
  body('category').isIn(EXPENSE_CATS).withMessage('Invalid expense category'),
  body('limit').isFloat({ gt: 0 }).withMessage('Limit must be greater than 0'),
];

router.get('/',       ctrl.list);
router.post('/',      budgetRules, handle, ctrl.create);
router.put('/:id',   budgetRules, handle, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
