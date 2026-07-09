const Deal = require('../models/Deal');
const { serializeUser } = require('../utils/serializeUser');

const serializeDeal = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    startup: obj.entrepreneurId.name
      ? {
          id: obj.entrepreneurId._id.toString(),
          name: obj.entrepreneurId.startupName || obj.entrepreneurId.name,
          logo: obj.entrepreneurId.avatarUrl || '',
          industry: obj.entrepreneurId.industry || ''
        }
      : obj.entrepreneurId.toString(),
    investor: obj.investorId.name ? serializeUser(doc.investorId) : obj.investorId.toString(),
    amount: obj.amount,
    equity: obj.equity,
    stage: obj.stage,
    status: obj.status,
    lastActivity: new Date(obj.updatedAt).toISOString()
  };
};

// @route  POST /api/deals
// @desc   Investor creates a new deal for an entrepreneur
exports.createDeal = async (req, res) => {
  try {
    if (req.user.role !== 'investor') {
      return res.status(403).json({ message: 'Only investors can create deals' });
    }

    const { entrepreneurId, amount, equity, stage } = req.body;
    if (!entrepreneurId || amount == null || equity == null || !stage) {
      return res.status(400).json({ message: 'entrepreneurId, amount, equity, and stage are required' });
    }

    const deal = await Deal.create({
      investorId: req.user._id,
      entrepreneurId,
      amount,
      equity,
      stage
    });

    const populated = await deal.populate(['investorId', 'entrepreneurId']);
    res.status(201).json({ deal: serializeDeal(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create deal', error: error.message });
  }
};

// @route  GET /api/deals
// @desc   List deals belonging to the logged-in user (investor sees deals they made,
//         entrepreneur sees deals made on their startup)
exports.getDeals = async (req, res) => {
  try {
    const filter = req.user.role === 'investor'
      ? { investorId: req.user._id }
      : { entrepreneurId: req.user._id };

    const deals = await Deal.find(filter)
      .populate('investorId')
      .populate('entrepreneurId')
      .sort({ updatedAt: -1 });

    res.json({ deals: deals.map(serializeDeal) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
};

// @route  PUT /api/deals/:id
// @desc   Update a deal's status/amount/equity/stage (investor only, own deals)
exports.updateDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'Deal not found' });

    if (deal.investorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own deals' });
    }

    const { amount, equity, stage, status } = req.body;
    if (amount != null) deal.amount = amount;
    if (equity != null) deal.equity = equity;
    if (stage) deal.stage = stage;
    if (status) deal.status = status;

    await deal.save();
    const populated = await deal.populate(['investorId', 'entrepreneurId']);
    res.json({ deal: serializeDeal(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update deal', error: error.message });
  }
};
