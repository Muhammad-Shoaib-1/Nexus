const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer'],
      required: true
    },
    // For deposit: null fromUserId, toUserId = the depositor (funds appear in their wallet)
    // For withdrawal: fromUserId = the withdrawer, null toUserId
    // For transfer: both set (investor -> entrepreneur)
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    amount: { type: Number, required: true, min: 0.01 },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
    note: { type: String, default: '' },
    failureReason: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
