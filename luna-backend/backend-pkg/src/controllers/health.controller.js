/**
 * Health Insights Controller — MongoDB
 */
const mongoose      = require('mongoose');
const User          = require('../models/User');
const SensorReading = require('../models/SensorReading');
const healthService = require('../services/health.service');
const { fillDailyGaps } = require('../utils/data.utils');

const getReadings = async (userId, days = 14) => {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().split('T')[0];
  
  const aggregated = await SensorReading.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: fromStr } } },
    {
      $group: {
        _id: "$date",
        heartRate: { $avg: "$heartRate" },
        temperature: { $avg: "$temperature" },
        sleepHours: { $avg: "$sleepHours" },
        sleepDisturbances: { $avg: "$sleepDisturbances" },
      }
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", heartRate: 1, temperature: 1, sleepHours: 1, sleepDisturbances: 1, _id: 0 } }
  ]);

  const filled = fillDailyGaps(aggregated, days);
  
  // Sanitize data: Filter out physiologically impossible temperatures (sensor noise)
  return filled.map(r => ({
    ...r,
    temperature: (r.temperature !== null && r.temperature < 35.0) ? null : r.temperature
  }));
};

exports.getSnapshot = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await getReadings(user._id, 14);
    return res.json({ success: true, data: healthService.buildHealthSnapshot(user, readings) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getHeartRate = async (req, res) => {
  try {
    const days     = parseInt(req.query.days) || 7;
    const readings = await getReadings(req.user.id, days);
    return res.json({
      success: true,
      data: {
        analysis: healthService.analyzeHeartRate(readings),
        trend:    readings.map(r => ({ date: r.date, heartRate: r.heartRate })),
        period:   `Past ${days} days`,
        yAxisLabel: 'Heart Rate (bpm)',
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getTemperature = async (req, res) => {
  try {
    const days     = parseInt(req.query.days) || 14;
    const readings = await getReadings(req.user.id, days);
    return res.json({
      success: true,
      data: {
        analysis:   healthService.analyzeTemperature(readings),
        trend:      readings.map(r => ({ date: r.date, temperature: r.temperature })),
        period:     `Past ${days} days`,
        yAxisLabel: 'Body Temperature (°C)',
        baseline:   36.7,
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getSleep = async (req, res) => {
  try {
    const days     = parseInt(req.query.days) || 7;
    const readings = await getReadings(req.user.id, days);
    return res.json({
      success: true,
      data: {
        analysis: healthService.analyzeSleep(readings),
        legend: [
          { label: 'Good', color: '#4CAF50' },
          { label: 'Fair', color: '#FF9800' },
          { label: 'Poor', color: '#F44336', range: '0–8 disturbances' },
        ],
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getInsights = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await getReadings(user._id, 7);
    const snapshot = healthService.buildHealthSnapshot(user, readings);
    return res.json({ success: true, data: { insights: snapshot.insights, phase: snapshot.currentPhase } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getStatus = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await getReadings(user._id, 7);
    const hr       = healthService.analyzeHeartRate(readings);
    const temp     = healthService.analyzeTemperature(readings);
    const sleep    = healthService.analyzeSleep(readings);
    const overall  = healthService.computeOverallHealth(hr, temp, sleep);
    const { getPhaseForDay, getCycleDay } = require('../services/cycle.service');
    const cycleDay = getCycleDay(user.lastPeriodStart);
    const phase    = getPhaseForDay(cycleDay, user.cycleLength);
    return res.json({
      success: true,
      data: {
        overallHealth: overall,
        phase: phase.phase, cycleDay,
        indicators: {
          heartRate:   { value: hr?.current,                         label: hr?.classification?.label   || 'N/A' },
          temperature: { value: temp?.current,                       label: temp?.classification?.label || 'N/A' },
          sleep:       { value: sleep?.current?.quality?.label,      label: sleep?.current?.quality?.label || 'N/A' },
        },
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
