const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { transferValidation, amountValidation } = require('../middleware/validate');
const { deposit, withdraw, transfer, getTransactions } = require('../controllers/transactionController');

router.post('/deposit', protect, amountValidation, deposit);
router.post('/withdraw', protect, amountValidation, withdraw);
router.post('/transfer', protect, transferValidation, transfer);
router.get('/', protect, getTransactions);

module.exports = router;
