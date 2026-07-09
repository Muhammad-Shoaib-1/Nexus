require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { Entrepreneur, Investor } = require('../models/User');

const run = async () => {
  await connectDB();
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await Entrepreneur.deleteMany({});
  await Investor.deleteMany({});

  await Entrepreneur.create([
    {
      name: 'Ayesha Khan',
      email: 'ayesha@startup.com',
      passwordHash,
      startupName: 'GreenCart',
      pitchSummary: 'Sustainable grocery delivery for urban Pakistan',
      fundingNeeded: 150000,
      industry: 'E-commerce',
      foundedYear: 2024,
      teamSize: 6,
      avatarUrl: 'https://ui-avatars.com/api/?name=Ayesha+Khan&background=random'
    },
    {
      name: 'Bilal Ahmed',
      email: 'bilal@startup.com',
      passwordHash,
      startupName: 'EduSpark',
      pitchSummary: 'AI tutoring platform for high school students',
      fundingNeeded: 80000,
      industry: 'EdTech',
      foundedYear: 2023,
      teamSize: 4,
      avatarUrl: 'https://ui-avatars.com/api/?name=Bilal+Ahmed&background=random'
    }
  ]);

  await Investor.create([
    {
      name: 'Sara Malik',
      email: 'sara@ventures.com',
      passwordHash,
      investmentInterests: ['E-commerce', 'FinTech'],
      investmentStage: ['Seed', 'Series A'],
      portfolioCompanies: ['PayEase', 'Cartify'],
      totalInvestments: 5,
      minInvestment: 20000,
      maxInvestment: 200000,
      avatarUrl: 'https://ui-avatars.com/api/?name=Sara+Malik&background=random'
    }
  ]);

  console.log('Seed complete. Sample login: ayesha@startup.com / Password123! (role: entrepreneur)');
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
