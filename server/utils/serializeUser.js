// Converts a Mongoose User document into the exact shape the frontend's
// src/types/index.ts expects: `id` instead of `_id`, string money fields,
// no passwordHash/__v, dates as ISO strings.
const serializeUser = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };

  const base = {
    id: obj._id.toString(),
    name: obj.name,
    email: obj.email,
    role: obj.role,
    avatarUrl: obj.avatarUrl || '',
    bio: obj.bio || '',
    isOnline: !!obj.isOnline,
    walletBalance: obj.walletBalance ?? 0,
    createdAt: obj.createdAt ? new Date(obj.createdAt).toISOString() : new Date().toISOString()
  };

  if (obj.role === 'entrepreneur') {
    return {
      ...base,
      startupName: obj.startupName || '',
      pitchSummary: obj.pitchSummary || '',
      fundingNeeded: String(obj.fundingNeeded ?? 0),
      industry: obj.industry || '',
      location: obj.location || '',
      foundedYear: obj.foundedYear,
      teamSize: obj.teamSize ?? 1
    };
  }

  if (obj.role === 'investor') {
    return {
      ...base,
      investmentInterests: obj.investmentInterests || [],
      investmentStage: obj.investmentStage || [],
      portfolioCompanies: obj.portfolioCompanies || [],
      totalInvestments: obj.totalInvestments ?? 0,
      minimumInvestment: String(obj.minInvestment ?? 0),
      maximumInvestment: String(obj.maxInvestment ?? 0)
    };
  }

  return base;
};

module.exports = { serializeUser };
