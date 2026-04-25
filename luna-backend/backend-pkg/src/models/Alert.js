const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:     {
      type: String,
      enum: [
        'period_reminder', 'period_prediction',
        'ovulation_detected', 'temperature_spike',
        'sleep_disturbance', 'heart_rate_alert',
        'medicine',
      ],
      required: true,
    },
    title:    { type: String, required: true },
    message:  { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    isRead:   { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
