const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const mlController = require('./src/controllers/ml.controller');

async function verify() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: /sara/i });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('Testing predictAuto for user:', user.email);

    const req = { user: { id: user._id.toString() } };
    const res = {
      json: (data) => {
        console.log('--- Success Response ---');
        console.log(JSON.stringify(data, null, 2));
        process.exit(0);
      },
      status: function(code) {
        console.log('--- Error Status:', code, '---');
        return {
          json: (data) => {
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
          }
        };
      }
    };

    await mlController.predictAuto(req, res);
  } catch (err) {
    console.error('Execution Error:', err);
    process.exit(1);
  }
}

verify();
