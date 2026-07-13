const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { messageValidation } = require('../middleware/validate');
const { getConversations, getThread, sendMessage } = require('../controllers/messageController');

router.get('/conversations', protect, getConversations);
router.get('/:userId', protect, getThread);
router.post('/', protect, messageValidation, sendMessage);

module.exports = router;
