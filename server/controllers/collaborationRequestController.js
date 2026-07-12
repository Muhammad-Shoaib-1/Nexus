const CollaborationRequest = require('../models/CollaborationRequest');
const { serializeUser } = require('../utils/serializeUser');
const notify = require('../utils/notify');

// Converts a populated request doc into frontend-friendly shape: `id` instead
// of `_id`, and populated investor/entrepreneur sub-docs run through serializeUser.
const serializeRequest = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    investorId: obj.investorId && obj.investorId.name ? serializeUser(doc.investorId) : obj.investorId?.toString(),
    entrepreneurId: obj.entrepreneurId && obj.entrepreneurId.name ? serializeUser(doc.entrepreneurId) : obj.entrepreneurId?.toString(),
    message: obj.message,
    status: obj.status,
    createdAt: new Date(obj.createdAt).toISOString()
  };
};

// @route  POST /api/requests
exports.createRequest = async (req, res) => {
  try {
    if (req.user.role !== 'investor') {
      return res.status(403).json({ message: 'Only investors can send collaboration requests' });
    }

    const { entrepreneurId, message } = req.body;
    if (!entrepreneurId) {
      return res.status(400).json({ message: 'entrepreneurId is required' });
    }

    const existing = await CollaborationRequest.findOne({
      investorId: req.user._id,
      entrepreneurId,
      status: 'pending'
    });
    if (existing) {
      return res.status(409).json({ message: 'A pending request already exists for this entrepreneur' });
    }

    const request = await CollaborationRequest.create({
      investorId: req.user._id,
      entrepreneurId,
      message: message || ''
    });

    await notify({
      userId: entrepreneurId,
      actorId: req.user._id,
      type: 'collaboration_request',
      content: `${req.user.name} sent you a collaboration request`,
      link: `/dashboard/entrepreneur`
    });

    res.status(201).json({ request: serializeRequest(request) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create request', error: error.message });
  }
};

// @route  GET /api/requests/entrepreneur
exports.getRequestsForEntrepreneur = async (req, res) => {
  try {
    const requests = await CollaborationRequest.find({ entrepreneurId: req.user._id })
      .populate('investorId')
      .sort({ createdAt: -1 });
    res.json({ requests: requests.map(serializeRequest) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// @route  GET /api/requests/investor
exports.getRequestsForInvestor = async (req, res) => {
  try {
    const requests = await CollaborationRequest.find({ investorId: req.user._id })
      .populate('entrepreneurId')
      .sort({ createdAt: -1 });
    res.json({ requests: requests.map(serializeRequest) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// @route  PUT /api/requests/:id
exports.updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
    }

    const request = await CollaborationRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.entrepreneurId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only respond to your own requests' });
    }

    request.status = status;
    await request.save();

    await notify({
      userId: request.investorId,
      actorId: req.user._id,
      type: 'collaboration_request',
      content: `${req.user.name} ${status} your collaboration request`,
      link: `/dashboard/investor`
    });

    res.json({ request: serializeRequest(request) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update request', error: error.message });
  }
};
