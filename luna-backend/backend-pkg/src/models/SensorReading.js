const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true }, 
    date: { type: String, required: true, index: true },
    heartRate: { type: Number, default: null },
    temperature: { type: Number, default: null },
    sleepHours: { type: Number, default: null },
    sleepDisturbances: { type: Number, default: 0 },
    sleepQuality: { type: String, enum: ['Good', 'Fair', 'Poor', null], default: null },
  },
  {
    timestamps: true,
    collection: 'readings' 
  }
);

// Compound index: one reading per user per date (optional, but good for performance)
sensorReadingSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
