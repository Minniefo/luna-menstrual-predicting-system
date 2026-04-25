const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName:        { type: String, required: true, trim: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true, select: false },
    age:             { type: Number, default: null },
    cycleLength:     { type: Number, default: 28 },
    periodLength:    { type: Number, default: 5 },
    lastPeriodStart: { type: String, default: () => new Date().toISOString().split('T')[0] },
    conditions:      { type: [String], default: [] },
    sensors: {
      heartRate:   { type: Boolean, default: true },
      temperature: { type: Boolean, default: true },
      sleep:       { type: Boolean, default: true },
    },
    notificationPrefs: {
      periodReminder:   { type: Boolean, default: true },
      ovulationAlert:   { type: Boolean, default: true },
      temperatureSpike: { type: Boolean, default: true },
      sleepDisturbance: { type: Boolean, default: true },
      morningCheckin:   { type: Boolean, default: false },
    },
    mlPredictionState: {
      prediction: { type: String, default: null },
      confidence: { type: Number, default: null },
      timestamp:  { type: Date, default: null }
    },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password helper
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Strip password from JSON output
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
