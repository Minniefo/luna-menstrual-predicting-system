const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:      { type: String, required: true, trim: true },
    dose:      { type: String, default: '' },
    frequency: { type: String, default: 'daily' },
    phase:     { type: String, default: 'all' },  // 'all' | 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
    time:      { type: String, default: '08:00' }, // HH:mm format
    notes:     { type: String, default: '' },
    taken:     { type: [String], default: [] },    // array of YYYY-MM-DD strings
    lastAlertDate: { type: String, default: '' },  // tracks last YYYY-MM-DD when alert was fired
  },
  { timestamps: true }
);

module.exports = mongoose.model('Medicine', medicineSchema);
