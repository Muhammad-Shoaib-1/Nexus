const { body, validationResult } = require('express-validator');

// Runs after a validation chain; returns 400 with details if anything failed.
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters').escape(),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['entrepreneur', 'investor']).withMessage("Role must be 'entrepreneur' or 'investor'"),
  handleValidation
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  body('role').isIn(['entrepreneur', 'investor']).withMessage("Role must be 'entrepreneur' or 'investor'"),
  handleValidation
];

const messageValidation = [
  body('receiverId').isMongoId().withMessage('Invalid receiverId'),
  body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Message must be 1-5000 characters').escape(),
  handleValidation
];

const dealValidation = [
  body('entrepreneurId').isMongoId().withMessage('Invalid entrepreneurId'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('equity').isFloat({ min: 0, max: 100 }).withMessage('Equity must be between 0 and 100'),
  body('stage').isIn(['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C']).withMessage('Invalid stage'),
  handleValidation
];

const meetingValidation = [
  body('participantId').isMongoId().withMessage('Invalid participantId'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters').escape(),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }).escape(),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be a valid date'),
  handleValidation
];

const transferValidation = [
  body('toUserId').isMongoId().withMessage('Invalid toUserId'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  handleValidation
];

const amountValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  handleValidation
];

module.exports = {
  handleValidation,
  registerValidation,
  loginValidation,
  messageValidation,
  dealValidation,
  meetingValidation,
  transferValidation,
  amountValidation
};
