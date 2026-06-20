const router   = require('express').Router();
const { body } = require('express-validator');
const { handle } = require('../middleware/validate');
const ctrl       = require('../controllers/goals');

const goalRules = [
  body('name').trim().notEmpty().withMessage('Goal name is required'),
  body('target').isFloat({ gt: 0 }).withMessage('Target must be greater than 0'),
  body('saved').optional().isFloat({ min: 0 }).withMessage('Saved must be 0 or more'),
  body('icon').optional().isString(),
  body('color').optional().isString(),
  body('date').optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
];

router.get('/',            ctrl.list);
router.post('/',           goalRules, handle, ctrl.create);
router.put('/:id',        goalRules, handle, ctrl.update);
router.delete('/:id',     ctrl.remove);
router.patch('/:id/funds',
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')],
  handle,
  ctrl.addFunds
);

module.exports = router;
