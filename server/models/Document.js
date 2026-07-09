const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileName: { type: String, required: true }, // name on disk
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shared: { type: Boolean, default: false },
    // Simple e-signature: a typed full name stands in for a drawn signature.
    // Swap for an actual signature-pad image upload later if needed.
    signature: {
      signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      signedByName: { type: String },
      signatureText: { type: String },
      signedAt: { type: Date }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
