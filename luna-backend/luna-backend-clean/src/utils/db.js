const mongoose = require('mongoose');

/**
 * Connect to MongoDB.
 * Uses MONGODB_URI from .env; falls back to in-memory mock for dev if not set.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/luna_db';
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅  MongoDB connected');
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message);
    // Don't exit – controllers fall back to mock data store
  }
};

module.exports = connectDB;
