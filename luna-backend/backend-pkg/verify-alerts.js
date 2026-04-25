const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Alert = require('./src/models/Alert');
const alertsController = require('./src/controllers/alerts.controller');

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: /sara/i });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  console.log('Evaluating alerts for:', user.email);
  
  const req = { user: { id: user._id.toString() } };
  const res = {
    json: async (data) => {
      console.log('Response:', JSON.stringify(data, null, 2));
      const mlAlert = await Alert.findOne({ userId: user._id, type: 'period_prediction' }).sort({ createdAt: -1 });
      if (mlAlert) {
        console.log('SUCCESS: ML Alert found!');
        console.log('Title:', mlAlert.title);
        console.log('Message:', mlAlert.message);
      } else {
        console.log('No ML Alert found yet.');
      }
      process.exit(0);
    },
    status: (code) => ({
      json: (data) => {
        console.error('Error Status:', code, data);
        process.exit(1);
      }
    })
  };

  await alertsController.evaluate(req, res);
}
verify();
