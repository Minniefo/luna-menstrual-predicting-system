const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({ "mlPredictionState.prediction": { $ne: null } }).lean();
  console.log(`Found ${users.length} users with ML predictions.`);
  users.forEach(u => {
    console.log(`User: ${u.email}, Prediction: ${u.mlPredictionState.prediction}, Confidence: ${u.mlPredictionState.confidence}`);
  });
  process.exit(0);
}

check();
