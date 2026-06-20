const router   = require('express').Router();
const { body } = require('express-validator');
const { handle }      = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const passport        = require('../config/passport');
const ctrl            = require('../controllers/auth');

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/register', authLimiter, registerRules, handle, ctrl.register);
router.post('/login',    authLimiter, loginRules,    handle, ctrl.login);
router.post('/refresh',  ctrl.refresh);
router.post('/logout',   ctrl.logout);

// Google OAuth — browser navigates here directly (not a fetch call)
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', {
    session:         false,
    failureRedirect: `${process.env.FRONTEND_URL}?error=oauth_failed`,
  }),
  ctrl.googleCallback
);

module.exports = router;
