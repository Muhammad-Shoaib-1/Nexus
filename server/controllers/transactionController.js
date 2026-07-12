const Transaction = require('../models/Transaction');
const { User } = require('../models/User');
const { serializeUser } = require('../utils/serializeUser');

const serializeTransaction = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    type: obj.type,
    fromUser: obj.fromUserId && obj.fromUserId.name ? serializeUser(doc.fromUserId) : obj.fromUserId?.toString() || null,
    toUser: obj.toUserId && obj.toUserId.name ? serializeUser(doc.toUserId) : obj.toUserId?.toString() || null,
    amount: obj.amount,
    status: obj.status,
    dealId: obj.dealId?.toString() || null,
    note: obj.note,
    failureReason: obj.failureReason,
    createdAt: new Date(obj.createdAt).toISOString()
  };
};

// @route  POST /api/transactions/deposit
// @desc   Simulated deposit into the logged-in user's sandbox wallet.
//         NOTE: this is a mock/sandbox — no real payment gateway (Stripe/PayPal) is called.
exports.deposit = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }

    const transaction = await Transaction.create({
      type: 'deposit',
      toUserId: req.user._id,
      amount,
      status: 'completed', // sandbox deposits always succeed
      note: 'Sandbox deposit (simulated — no real funds)'
    });

    req.user.walletBalance = (req.user.walletBalance || 0) + amount;
    await req.user.save();

    res.status(201).json({
      transaction: serializeTransaction(transaction),
      walletBalance: req.user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Deposit failed', error: error.message });
  }
};

// @route  POST /api/transactions/withdraw
exports.withdraw = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }

    if (amount > (req.user.walletBalance || 0)) {
      const failed = await Transaction.create({
        type: 'withdrawal',
        fromUserId: req.user._id,
        amount,
        status: 'failed',
        failureReason: 'Insufficient balance',
        note: 'Sandbox withdrawal (simulated)'
      });
      return res.status(400).json({
        message: 'Insufficient balance',
        transaction: serializeTransaction(failed)
      });
    }

    const transaction = await Transaction.create({
      type: 'withdrawal',
      fromUserId: req.user._id,
      amount,
      status: 'completed',
      note: 'Sandbox withdrawal (simulated — no real funds)'
    });

    req.user.walletBalance -= amount;
    await req.user.save();

    res.status(201).json({
      transaction: serializeTransaction(transaction),
      walletBalance: req.user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Withdrawal failed', error: error.message });
  }
};

// @route  POST /api/transactions/transfer
// @desc   Simulated investor -> entrepreneur transfer, optionally tied to a Deal
exports.transfer = async (req, res) => {
  try {
    const { toUserId, amount, dealId, note } = req.body;

    if (!toUserId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'toUserId and a positive amount are required' });
    }

    if (toUserId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    const recipient = await User.findById(toUserId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (amount > (req.user.walletBalance || 0)) {
      const failed = await Transaction.create({
        type: 'transfer',
        fromUserId: req.user._id,
        toUserId,
        amount,
        status: 'failed',
        failureReason: 'Insufficient balance',
        dealId: dealId || null,
        note: note || 'Sandbox transfer (simulated)'
      });
      return res.status(400).json({
        message: 'Insufficient balance',
        transaction: serializeTransaction(failed)
      });
    }

    req.user.walletBalance -= amount;
    recipient.walletBalance = (recipient.walletBalance || 0) + amount;
    await req.user.save();
    await recipient.save();

    const transaction = await Transaction.create({
      type: 'transfer',
      fromUserId: req.user._id,
      toUserId,
      amount,
      status: 'completed',
      dealId: dealId || null,
      note: note || 'Sandbox transfer (simulated — no real funds)'
    });

    const populated = await transaction.populate(['fromUserId', 'toUserId']);

    res.status(201).json({
      transaction: serializeTransaction(populated),
      walletBalance: req.user.walletBalance
    });
  } catch (error) {
    res.status(500).json({ message: 'Transfer failed', error: error.message });
  }
};

// @route  GET /api/transactions
// @desc   Transaction history for the logged-in user (as sender or recipient)
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }]
    })
      .populate('fromUserId')
      .populate('toUserId')
      .sort({ createdAt: -1 });

    res.json({
      transactions: transactions.map(serializeTransaction),
      walletBalance: req.user.walletBalance || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
};
