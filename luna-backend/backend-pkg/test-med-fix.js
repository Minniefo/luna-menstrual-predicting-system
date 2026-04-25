const mongoose = require('mongoose');
require('dotenv').config();
const Medicine = require('./src/models/Medicine');
const Alert = require('./src/models/Alert');
const alertsService = require('./src/services/alerts.service');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();
  const time = now.toTimeString().split(' ')[0].substring(0, 5);
  
  console.log('Testing medicine reminder at:', time);
  
  const med = await Medicine.findOne({});
  if (!med) {
    console.log('No medicine found to test');
    process.exit(1);
  }

  console.log('Using medicine:', med.name, 'for user:', med.userId);
  
  try {
    const alert = await alertsService.createMedicineAlert(med.userId, med.name, time);
    console.log('SUCCESS: Alert created!');
    console.log(JSON.stringify(alert, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
}
test();
