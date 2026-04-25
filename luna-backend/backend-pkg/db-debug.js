const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();
const SensorReading = require('./src/models/SensorReading');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  const userIdStr = '69e8dd03cdb7e640031b6686';
  
  console.log('--- Database Debug ---');
  console.log('Target User ID:', userIdStr);

  // 1. Try finding with string
  const withString = await SensorReading.find({ userId: userIdStr }).limit(1);
  console.log('Found with String ID:', withString.length > 0 ? 'YES' : 'NO');

  // 2. Try finding with ObjectId
  const withObjectId = await SensorReading.find({ userId: new mongoose.Types.ObjectId(userIdStr) }).limit(1);
  console.log('Found with ObjectId:', withObjectId.length > 0 ? 'YES' : 'NO');

  // 3. Just look for ANY readings to see how userId is stored
  const anyReading = await SensorReading.findOne();
  if (anyReading) {
    console.log('Sample Reading from DB:');
    console.log(' - userId:', anyReading.userId);
    console.log(' - userId type:', typeof anyReading.userId);
    console.log(' - date:', anyReading.date);
  } else {
    console.log('No readings found in the collection at all.');
  }

  process.exit(0);
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});
