const mongoose = require('mongoose');
const dns = require('dns');

// Force Node's internal resolver to use Google's DNS.
// Fixes "querySrv ECONNREFUSED" on Windows where Node ignores the
// OS-level DNS settings even when nslookup works fine.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const uri = (process.env.MONGO_URI || '').trim();
    if (!uri) {
      throw new Error('MONGO_URI is missing or empty — check your .env file');
    }
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
