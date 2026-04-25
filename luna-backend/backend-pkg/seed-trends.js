const mongoose = require('mongoose');
const SensorReading = require('./src/models/SensorReading');
const User = require('./src/models/User');
require('dotenv').config();

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const user = await User.findOne({ email: 'test@luna.com' });
  if (!user) {
    console.log('User test@luna.com not found. Please sign up first.');
    process.exit(1);
  }

  const userId = user._id;
  const readings = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    readings.push({
      userId,
      date: dateStr,
      heartRate: 65 + Math.random() * 15,
      temperature: 36.4 + Math.random() * 0.8,
      sleepHours: 6 + Math.random() * 3,
      sleepDisturbances: Math.floor(Math.random() * 5),
    });
  }

  await SensorReading.deleteMany({ userId });
  await SensorReading.insertMany(readings);

  console.log('Seed successful: 30 days of data for test@luna.com');
  process.exit(0);
};

seed();
