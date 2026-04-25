const mongoose = require('mongoose');

/**
 * Connect to MongoDB and seed demo data on first run.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/luna_db';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅  MongoDB connected →', uri);
    await seedDemoData();
  } catch (err) {
    console.error('❌  MongoDB connection error:', err.message);
    console.error('    Retrying in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

/**
 * Seed one demo user + 3 cycle entries + 30 sensor readings on first run.
 * Skips if demo user already exists.
 */
const seedDemoData = async () => {
  const User          = require('../models/User');
  const CycleEntry    = require('../models/CycleEntry');
  const SensorReading = require('../models/SensorReading');
  const Medicine      = require('../models/Medicine');

  const exists = await User.findOne({ email: 'sara@luna.app' });
  if (exists) return;  // already seeded

  console.log('🌱  Seeding demo data…');

  // 1. Demo user
  const user = await User.create({
    name:            'Sara Johnson',
    email:           'sara@luna.app',
    password:        'Test@1234',
    age:             26,
    cycleLength:     28,
    periodLength:    5,
    lastPeriodStart: '2026-03-17',
    conditions:      ['mild_anemia'],
    sensors:         { heartRate: true, temperature: true, sleep: true },
    notificationPrefs: {
      periodReminder: true, ovulationAlert: true,
      temperatureSpike: true, sleepDisturbance: true, morningCheckin: false,
    },
  });

  // 2. Cycle history (3 cycles)
  const cycleStarts = ['2026-01-18', '2026-02-15', '2026-03-15'];
  for (let i = 0; i < cycleStarts.length; i++) {
    const start = new Date(cycleStarts[i]);
    const end   = new Date(start); end.setDate(start.getDate() + 4);
    const prev  = i > 0 ? new Date(cycleStarts[i - 1]) : null;
    const duration = prev
      ? Math.round((start - prev) / 86400000)
      : 28;
    await CycleEntry.create({
      userId: user._id, startDate: cycleStarts[i],
      endDate: end.toISOString().split('T')[0],
      duration, periodLength: 5, phase: 'menstrual',
    });
  }

  // 3. Sensor readings (30 days from 2026-03-17)
  const readings = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date('2026-03-17');
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const hrs = parseFloat((6.5 + Math.sin(i / 4) * 1.2).toFixed(1));
    const dist = Math.round(Math.abs(Math.sin(i) * 4));
    readings.push({
      userId:            user._id,
      date:              dateStr,
      heartRate:         Math.round(65 + Math.sin(i / 3) * 10),
      temperature:       parseFloat((36.4 + Math.sin(i / 5) * 0.4).toFixed(1)),
      sleepHours:        hrs,
      sleepDisturbances: dist,
      sleepQuality:      hrs >= 7 && dist <= 1 ? 'Good' : hrs >= 6 ? 'Fair' : 'Poor',
    });
  }
  await SensorReading.insertMany(readings);

  // 4. Medicines
  await Medicine.insertMany([
    { userId: user._id, name: 'Iron Supplement',     dose: '65 mg',  frequency: 'daily', phase: 'menstrual', notes: 'Take with food', taken: [] },
    { userId: user._id, name: 'Evening Primrose Oil', dose: '500 mg', frequency: 'daily', phase: 'luteal',    notes: 'For PMS relief', taken: [] },
  ]);

  console.log(`✅  Demo data seeded (user: sara@luna.app / Test@1234)`);
};

module.exports = connectDB;
