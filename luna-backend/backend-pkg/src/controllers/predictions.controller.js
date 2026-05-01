/**
 * Predictions Controller — MongoDB
 */
const User          = require('../models/User');
const SensorReading = require('../models/SensorReading');
const cycleService  = require('../services/cycle.service');

exports.getNextPeriod = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();

    const basePrediction = cycleService.predictNextPeriod(user.lastPeriodStart, user.cycleLength);
    let daysRemaining = cycleService.daysUntilNextPeriod(basePrediction);
    let accuracyStr = "Calendar Fallback";
    let inferenceMethod = "calendar_logic";

    if (user.mlPredictionState && user.mlPredictionState.prediction) {
      const state = user.mlPredictionState;
      const confPercent = state.confidence * 100;
      accuracyStr = `Edge ML ${confPercent >= 100 ? 99 : confPercent.toFixed(0)}%`;
      inferenceMethod = "iot_ml_pipeline";

      if (state.prediction === "Period likely soon") {
        daysRemaining = 2; // Override to 2 days to trigger the "soon" warning state on flutter
      } else if (state.prediction === "Cycle delayed") {
        daysRemaining = daysRemaining > 0 ? daysRemaining + 5 : 5;
      }
    }

    return res.json({
      success: true,
      data: {
        prediction: basePrediction.toISOString().split('T')[0],
        daysRemaining: daysRemaining,
        accuracy: accuracyStr,
        features_used: { inference_method: inferenceMethod },
        timestamp: user.mlPredictionState?.timestamp || new Date().toISOString()
      }
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getOvulationWindow = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const ov = cycleService.calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);
    return res.json({ success: true, data: { ovulationDate: ov.ovulationDate.toISOString().split('T')[0], fertileStart: ov.fertileStart.toISOString().split('T')[0], fertileEnd: ov.fertileEnd.toISOString().split('T')[0] } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getPhaseTimeline = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const start    = new Date(user.lastPeriodStart);
    const cycleDay = cycleService.getCycleDay(user.lastPeriodStart);
    const segments = [
      { name: 'Menstrual',  days: user.periodLength,                                             emoji: '🔴', color: '#E91E63' },
      { name: 'Follicular', days: user.cycleLength - user.periodLength - 14 - 2,                 emoji: '🌱', color: '#4CAF50' },
      { name: 'Ovulation',  days: 3,                                                              emoji: '⭐', color: '#FF9800' },
      { name: 'Luteal',     days: 14,                                                             emoji: '🌙', color: '#9C27B0' },
    ];
    const phases = [];
    let day = 1;
    for (const seg of segments) {
      const segStart = new Date(start); segStart.setDate(start.getDate() + day - 1);
      const segEnd   = new Date(segStart); segEnd.setDate(segStart.getDate() + seg.days - 1);
      phases.push({ phase: seg.name, emoji: seg.emoji, color: seg.color, startDay: day, endDay: day + seg.days - 1, startDate: segStart.toISOString().split('T')[0], endDate: segEnd.toISOString().split('T')[0], isActive: cycleDay >= day && cycleDay < day + seg.days, isYouAreHere: cycleDay >= day && cycleDay < day + seg.days });
      day += seg.days;
    }
    return res.json({ success: true, data: { phases, currentDay: cycleDay } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getConfidence = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // Stripped rule-based prediction.
    return res.json({ success: true, data: { score: 0.8, percent: "80%", signals: ["Awaiting ML Dashboard refresh"], dataPoints: 0, note: "Confidence currently delegated to Wearable Backend metrics natively" } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
