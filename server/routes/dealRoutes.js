const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { dealValidation } = require('../middleware/validate');
const { createDeal, getDeals, updateDeal } = require('../controllers/dealController');

router.post('/', protect, authorize('investor'), dealValidation, createDeal);
router.get('/', protect, getDeals);
router.put('/:id', protect, authorize('investor'), updateDeal);

module.exports = router;
