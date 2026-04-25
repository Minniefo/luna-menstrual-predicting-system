const mongoose = require('mongoose');
require('dotenv').config();
const SensorReading = require('./src/models/SensorReading');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const readings = await SensorReading.find().sort({ date: -1 }).limit(20);
  console.log('--- Sample Readings ---');
  readings.forEach(r => {
    console.log(`Date: ${r.date}, HR: ${r.heartRate}, Temp: ${r.temperature}, SleepDist: ${r.sleepDisturbances}`);
  });
  process.exit(0);
}

check();
