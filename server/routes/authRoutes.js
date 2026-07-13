const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  send2FACode,
  verify2FACode,
  toggle2FA
} = require('../controllers/authController');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/2fa/send-code', send2FACode);
router.post('/2fa/verify-code', verify2FACode);
router.put('/2fa/toggle', protect, toggle2FA);

module.exports = router;
