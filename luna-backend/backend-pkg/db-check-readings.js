const mongoose = require('mongoose');
require('dotenv').config();
const SensorReading = require('./src/models/SensorReading');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await SensorReading.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  console.log('--- Readings Distribution ---');
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

check();
