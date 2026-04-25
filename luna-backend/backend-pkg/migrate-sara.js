const mongoose = require('mongoose');
require('dotenv').config();
const SensorReading = require('./src/models/SensorReading');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const result = await SensorReading.updateMany(
    { userId: '69e9d75910d3be9891412118' },
    { $set: { userId: new mongoose.Types.ObjectId('69e8dd03cdb7e640031b6686') } }
  );

  console.log('--- Migration Result ---');
  console.log('Matched:', result.matchedCount);
  console.log('Modified:', result.modifiedCount);

  process.exit(0);
}

migrate();
