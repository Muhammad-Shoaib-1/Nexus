const mongoose = require('mongoose');

// Base schema shared by all users (matches Client/src/types/index.ts `User`)
const options = { discriminatorKey: 'role', timestamps: true };

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    isOnline: { type: Boolean, default: false },
    walletBalance: { type: Number, default: 0 } // cents-free simple USD balance for the payment sandbox
  },
  options
);

const User = mongoose.model('User', userSchema);

// Entrepreneur discriminator (extends User)
const Entrepreneur = User.discriminator(
  'entrepreneur',
  new mongoose.Schema({
    startupName: { type: String, default: '' },
    pitchSummary: { type: String, default: '' },
    fundingNeeded: { type: Number, default: 0 },
    industry: { type: String, default: '' },
    location: { type: String, default: '' },
    foundedYear: { type: Number },
    teamSize: { type: Number, default: 1 }
  })
);

// Investor discriminator (extends User)
const Investor = User.discriminator(
  'investor',
  new mongoose.Schema({
    investmentInterests: { type: [String], default: [] },
    investmentStage: { type: [String], default: [] },
    portfolioCompanies: { type: [String], default: [] },
    totalInvestments: { type: Number, default: 0 },
    minInvestment: { type: Number, default: 0 },
    maxInvestment: { type: Number, default: 0 }
  })
);

module.exports = { User, Entrepreneur, Investor };
