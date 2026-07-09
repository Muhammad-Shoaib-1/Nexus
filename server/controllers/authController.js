const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Entrepreneur, Investor } = require('../models/User');
const generateToken = require('../utils/generateToken');
const { serializeUser } = require('../utils/serializeUser');

// In-memory reset token store for now — swap for a DB field/collection
// with an expiry once you wire up real email sending (Nodemailer, Week 3).
const resetTokens = new Map();

// @route  POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }
    if (!['entrepreneur', 'investor'].includes(role)) {
      return res.status(400).json({ message: "role must be 'entrepreneur' or 'investor'" });
    }

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
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password, and role are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or user not found' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials or user not found' });
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

    // TODO (Week 3, Milestone 7): send this token via Nodemailer instead of returning it.
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
