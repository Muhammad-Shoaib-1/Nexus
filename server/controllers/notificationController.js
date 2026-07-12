const Notification = require('../models/Notification');

const serializeNotification = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    type: obj.type,
    content: obj.content,
    link: obj.link,
    isRead: obj.isRead,
    actor: obj.actorId && obj.actorId.name
      ? { id: obj.actorId._id.toString(), name: obj.actorId.name, avatarUrl: obj.actorId.avatarUrl }
      : null,
    createdAt: new Date(obj.createdAt).toISOString()
  };
};

// @route  GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .populate('actorId')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    res.json({ notifications: notifications.map(serializeNotification), unreadCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// @route  PUT /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    notification.isRead = true;
    await notification.save();
    res.json({ notification: serializeNotification(notification) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

// @route  PUT /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notifications', error: error.message });
  }
};
