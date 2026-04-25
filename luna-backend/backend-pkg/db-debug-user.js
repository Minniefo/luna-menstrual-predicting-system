const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOne({ email: /sara/i }).lean();
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
}

check();
