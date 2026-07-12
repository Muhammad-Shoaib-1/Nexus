const Meeting = require('../models/Meeting');
const { serializeUser } = require('../utils/serializeUser');
const notify = require('../utils/notify');

const serializeMeeting = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    organizer: obj.organizerId.name ? serializeUser(doc.organizerId) : obj.organizerId.toString(),
    participant: obj.participantId.name ? serializeUser(doc.participantId) : obj.participantId.toString(),
    title: obj.title,
    description: obj.description,
    scheduledAt: new Date(obj.scheduledAt).toISOString(),
    durationMinutes: obj.durationMinutes,
    status: obj.status,
    createdAt: new Date(obj.createdAt).toISOString()
  };
};

// Checks whether either party already has a pending/accepted meeting
// whose time range overlaps the requested slot.
const hasConflict = async ({ organizerId, participantId, scheduledAt, durationMinutes, excludeId }) => {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const query = {
    status: { $in: ['pending', 'accepted'] },
    $or: [
      { organizerId: { $in: [organizerId, participantId] } },
      { participantId: { $in: [organizerId, participantId] } }
    ]
  };
  if (excludeId) query._id = { $ne: excludeId };

  const candidates = await Meeting.find(query);

  return candidates.some((m) => {
    const mStart = new Date(m.scheduledAt);
    const mEnd = new Date(mStart.getTime() + m.durationMinutes * 60000);
    return start < mEnd && end > mStart; // ranges overlap
  });
};

// @route  POST /api/meetings
// @desc   Request a meeting with another user. Rejects if it would double-book either party.
exports.createMeeting = async (req, res) => {
  try {
    const { participantId, title, description, scheduledAt, durationMinutes } = req.body;

    if (!participantId || !title || !scheduledAt) {
      return res.status(400).json({ message: 'participantId, title, and scheduledAt are required' });
    }

    const duration = durationMinutes || 30;
    const scheduledDate = new Date(scheduledAt);

    if (scheduledDate < new Date()) {
      return res.status(400).json({ message: 'Meeting time must be in the future' });
    }

    const conflict = await hasConflict({
      organizerId: req.user._id,
      participantId,
      scheduledAt: scheduledDate,
      durationMinutes: duration
    });

    if (conflict) {
      return res.status(409).json({ message: 'This time slot conflicts with an existing meeting for you or the other participant' });
    }

    const meeting = await Meeting.create({
      organizerId: req.user._id,
      participantId,
      title,
      description: description || '',
      scheduledAt: scheduledDate,
      durationMinutes: duration
    });

    await notify({
      userId: participantId,
      actorId: req.user._id,
      type: 'meeting',
      content: `${req.user.name} requested a meeting: "${title}"`,
      link: '/meetings'
    });

    const populated = await meeting.populate(['organizerId', 'participantId']);
    res.status(201).json({ meeting: serializeMeeting(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create meeting', error: error.message });
  }
};

// @route  GET /api/meetings
// @desc   List all meetings where the logged-in user is organizer or participant
exports.getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ organizerId: req.user._id }, { participantId: req.user._id }]
    })
      .populate('organizerId')
      .populate('participantId')
      .sort({ scheduledAt: 1 });

    res.json({ meetings: meetings.map(serializeMeeting) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch meetings', error: error.message });
  }
};

// @route  PUT /api/meetings/:id
// @desc   Accept, decline, cancel, or reschedule a meeting
exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const isOrganizer = meeting.organizerId.toString() === req.user._id.toString();
    const isParticipant = meeting.participantId.toString() === req.user._id.toString();

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ message: 'You are not part of this meeting' });
    }

    const { status, scheduledAt, durationMinutes } = req.body;

    // Only the invited participant can accept/decline; either side can cancel.
    if (status) {
      if (['accepted', 'declined'].includes(status) && !isParticipant) {
        return res.status(403).json({ message: 'Only the invited participant can accept or decline' });
      }
      meeting.status = status;

      if (['accepted', 'declined'].includes(status)) {
        await notify({
          userId: meeting.organizerId,
          actorId: req.user._id,
          type: 'meeting',
          content: `${req.user.name} ${status} your meeting request: "${meeting.title}"`,
          link: '/meetings'
        });
      }
    }

    if (scheduledAt || durationMinutes) {
      const newScheduledAt = scheduledAt ? new Date(scheduledAt) : meeting.scheduledAt;
      const newDuration = durationMinutes || meeting.durationMinutes;

      const conflict = await hasConflict({
        organizerId: meeting.organizerId,
        participantId: meeting.participantId,
        scheduledAt: newScheduledAt,
        durationMinutes: newDuration,
        excludeId: meeting._id
      });
      if (conflict) {
        return res.status(409).json({ message: 'This new time conflicts with an existing meeting' });
      }

      meeting.scheduledAt = newScheduledAt;
      meeting.durationMinutes = newDuration;
      meeting.status = 'pending'; // rescheduling resets confirmation
    }

    await meeting.save();
    const populated = await meeting.populate(['organizerId', 'participantId']);
    res.json({ meeting: serializeMeeting(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update meeting', error: error.message });
  }
};
