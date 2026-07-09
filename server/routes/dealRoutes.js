const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createDeal, getDeals, updateDeal } = require('../controllers/dealController');

router.post('/', protect, createDeal);
router.get('/', protect, getDeals);
router.put('/:id', protect, updateDeal);

module.exports = router;
