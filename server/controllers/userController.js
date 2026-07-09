const { User } = require('../models/User');
const { serializeUser } = require('../utils/serializeUser');

// @route  GET /api/users/:id
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

// @route  GET /api/users?role=investor
exports.listUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter);
    res.json({ users: users.map(serializeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

// @route  PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const { passwordHash, email, role, _id, id, ...safeUpdates } = req.body;

    const updated = await User.findByIdAndUpdate(req.params.id, safeUpdates, {
      new: true,
      runValidators: true
    });

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ user: serializeUser(updated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
