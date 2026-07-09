const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entrepreneurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    equity: { type: Number, required: true }, // percentage, e.g. 15 for 15%
    stage: {
      type: String,
      enum: ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C'],
      required: true
    },
    status: {
      type: String,
      enum: ['Due Diligence', 'Term Sheet', 'Negotiation', 'Closed', 'Passed'],
      default: 'Due Diligence'
    }
  },
  { timestamps: true } // updatedAt doubles as "last activity"
);

module.exports = mongoose.model('Deal', dealSchema);
