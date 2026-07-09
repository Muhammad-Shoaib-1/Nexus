const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUser, listUsers, updateUser } = require('../controllers/userController');

router.get('/', protect, listUsers);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);

module.exports = router;
