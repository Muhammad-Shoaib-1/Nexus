const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // recipient
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who triggered it (optional)
    type: {
      type: String,
      enum: ['message', 'collaboration_request', 'meeting', 'deal', 'document'],
      required: true
    },
    content: { type: String, required: true },
    link: { type: String, default: '' }, // frontend route to navigate to on click
    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
