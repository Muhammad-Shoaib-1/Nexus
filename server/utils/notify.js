const Notification = require('../models/Notification');

/**
 * Creates a notification for a recipient. Fire-and-forget style —
 * callers should not let a notification failure block the main action,
 * so this swallows its own errors and just logs them.
 */
const notify = async ({ userId, actorId, type, content, link }) => {
  try {
    await Notification.create({ userId, actorId, type, content, link });
  } catch (error) {
    console.error('Failed to create notification:', error.message);
  }
};

module.exports = notify;
