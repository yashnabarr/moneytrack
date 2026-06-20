const router   = require('express').Router();
const { body } = require('express-validator');
const { handle } = require('../middleware/validate');
const ctrl       = require('../controllers/user');

router.get('/profile', ctrl.getProfile);
router.get('/data',    ctrl.getAllData);      // hydrate-on-login endpoint

router.put('/profile',
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('countryCode').optional()
      .isLength({ min: 2, max: 2 }).withMessage('Country code must be 2 characters'),
  ],
  handle,
  ctrl.updateProfile
);

router.delete('/data', ctrl.clearData);

module.exports = router;
