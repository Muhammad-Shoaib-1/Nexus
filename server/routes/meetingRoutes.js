const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { meetingValidation } = require('../middleware/validate');
const { createMeeting, getMeetings, updateMeeting } = require('../controllers/meetingController');

router.post('/', protect, meetingValidation, createMeeting);
router.get('/', protect, getMeetings);
router.put('/:id', protect, updateMeeting);

module.exports = router;
