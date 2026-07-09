const mongoose = require('mongoose');

const collaborationRequestSchema = new mongoose.Schema(
  {
    investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    entrepreneurId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

// Prevent the same investor from sending duplicate pending requests to the same entrepreneur
collaborationRequestSchema.index({ investorId: 1, entrepreneurId: 1 }, { unique: false });

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema);
