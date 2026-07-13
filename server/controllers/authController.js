const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Entrepreneur, Investor } = require('../models/User');
const generateToken = require('../utils/generateToken');
const { serializeUser } = require('../utils/serializeUser');

// In-memory stores for now — swap for a DB collection with a real expiry
// index once you wire up real email sending (Nodemailer).
const resetTokens = new Map();
const otpStore = new Map(); // userId -> { code, expires }

// @route  POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const Model = role === 'entrepreneur' ? Entrepreneur : Investor;

    const user = await Model.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });

    const token = generateToken(user._id, user.role);
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @route  POST /api/auth/login
// @desc   If the account has 2FA enabled, this does NOT return a token yet —
//         it returns { requires2FA: true, userId } and the client must call
//         /2fa/send-code then /2fa/verify-code to get the real token.
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email: email.toLowerCase(), role }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or user not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials or user not found' });
    }

    if (user.twoFactorEnabled) {
      return res.json({ requires2FA: true, userId: user._id.toString() });
    }

    const token = generateToken(user._id, user.role);
    res.json({ token, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @route  GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

// @route  POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    resetTokens.set(token, { userId: user._id.toString(), expires: Date.now() + 15 * 60 * 1000 });

    // TODO: send this token via Nodemailer instead of returning it directly.
    res.json({ message: 'Password reset instructions generated', resetToken: token });
  } catch (error) {
    res.status(500).json({ message: 'Request failed', error: error.message });
  }
};

// @route  POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const entry = resetTokens.get(token);

    if (!entry || entry.expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(entry.userId, { passwordHash });
    resetTokens.delete(token);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error: error.message });
  }
};

// @route  POST /api/auth/2fa/send-code
// @desc   Mock OTP delivery. NOTE: this is a sandbox — no real SMS/email is
// sent. The code is returned directly in the response, standing in for what
// would normally go out via Nodemailer/Twilio.
exports.send2FACode = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code
    otpStore.set(userId, { code, expires: Date.now() + 5 * 60 * 1000 });

    // TODO: send via real email/SMS provider. Returned here only because
    // this is a sandbox with no configured provider.
    res.json({ message: 'Verification code sent (sandbox — returned directly, no real email sent)', code });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send code', error: error.message });
  }
};

// @route  POST /api/auth/2fa/verify-code
exports.verify2FACode = async (req, res) => {
  try {
    const { userId, code } = req.body;
    const entry = otpStore.get(userId);

    if (!entry || entry.expires < Date.now()) {
      return res.status(400).json({ message: 'Code expired or not requested — request a new one' });
    }
    if (entry.code !== code) {
      return res.status(400).json({ message: 'Incorrect code' });
    }

    otpStore.delete(userId);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = generateToken(user._id, user.role);
    res.json({ token, user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
};

// @route  PUT /api/auth/2fa/toggle
// @desc   Logged-in user turns 2FA on/off for their own account
exports.toggle2FA = async (req, res) => {
  try {
    const { enabled } = req.body;
    req.user.twoFactorEnabled = !!enabled;
    await req.user.save();
    res.json({ user: serializeUser(req.user) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update 2FA setting', error: error.message });
  }
};
