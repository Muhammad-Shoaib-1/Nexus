const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createRequest,
  getRequestsForEntrepreneur,
  getRequestsForInvestor,
  updateRequestStatus
} = require('../controllers/collaborationRequestController');

router.post('/', protect, createRequest);
router.get('/entrepreneur', protect, getRequestsForEntrepreneur);
router.get('/investor', protect, getRequestsForInvestor);
router.put('/:id', protect, updateRequestStatus);

module.exports = router;
