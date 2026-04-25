const mongoose = require('mongoose');

const cycleEntrySchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    startDate:    { type: String, required: true },   // YYYY-MM-DD
    endDate:      { type: String, default: null },
    duration:     { type: Number, default: 28 },      // days since previous start
    periodLength: { type: Number, default: 5 },
    phase:        { type: String, default: 'menstrual' },
    notes:        { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CycleEntry', cycleEntrySchema);
