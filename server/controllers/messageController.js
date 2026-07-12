const Message = require('../models/Message');
const { serializeUser } = require('../utils/serializeUser');
const notify = require('../utils/notify');

const serializeMessage = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    senderId: obj.senderId.toString(),
    receiverId: obj.receiverId.toString(),
    content: obj.content,
    timestamp: new Date(obj.timestamp).toISOString(),
    isRead: obj.isRead
  };
};

// @route  GET /api/messages/conversations
// @desc   List all conversations for the logged-in user, with the other
//         participant's profile and the most recent message attached.
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    })
      .populate('senderId')
      .populate('receiverId')
      .sort({ timestamp: -1 });

    const byPartner = new Map();

    for (const msg of messages) {
      const isSender = msg.senderId._id.toString() === userId.toString();
      const partner = isSender ? msg.receiverId : msg.senderId;
      const partnerId = partner._id.toString();

      // Messages are already sorted newest-first, so the first one seen
      // per partner is the most recent — skip if we've already recorded one.
      if (byPartner.has(partnerId)) continue;

      byPartner.set(partnerId, {
        id: `conv-${userId}-${partnerId}`,
        participant: serializeUser(partner),
        lastMessage: serializeMessage(msg),
        updatedAt: new Date(msg.timestamp).toISOString()
      });
    }

    const conversations = Array.from(byPartner.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations', error: error.message });
  }
};

// @route  GET /api/messages/:userId
// @desc   Get the full message thread between the logged-in user and :userId.
//         Marks any unread messages from that user as read.
exports.getThread = async (req, res) => {
  try {
    const userId = req.user._id;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ timestamp: 1 });

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    res.json({ messages: messages.map(serializeMessage) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
};

// @route  POST /api/messages
// @desc   Send a message to another user
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      content: content.trim()
    });

    await notify({
      userId: receiverId,
      actorId: req.user._id,
      type: 'message',
      content: `${req.user.name} sent you a message`,
      link: `/chat/${req.user._id}`
    });

    res.status(201).json({ message: serializeMessage(message) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
};
