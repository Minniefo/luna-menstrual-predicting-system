/**
 * Trends & Analytics Controller — MongoDB
 */
const mongoose      = require('mongoose');
const User          = require('../models/User');
const CycleEntry    = require('../models/CycleEntry');
const SensorReading = require('../models/SensorReading');
const trendsService = require('../services/trends.service');
const { fillDailyGaps } = require('../utils/data.utils');

exports.getOverview = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const cycles   = await CycleEntry.find({ userId: user._id }).sort({ startDate: 1 }).lean();
    
    const aggregated = await SensorReading.aggregate([
      { $match: { userId: user._id } },
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

    const readings = fillDailyGaps(aggregated, 28);

    return res.json({ success: true, data: trendsService.buildTrendOverview(cycles, readings) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getCycleDurationTrend = async (req, res) => {
  try {
    const cycles = await CycleEntry.find({ userId: req.user.id }).sort({ startDate: 1 }).lean();
    return res.json({ success: true, data: { trend: trendsService.buildCycleDurationTrend(cycles), xAxis: 'Month', yAxis: 'Duration (days)' } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getCycleComparison = async (req, res) => {
  try {
    const n      = parseInt(req.query.n) || 6;
    const cycles = await CycleEntry.find({ userId: req.user.id }).sort({ startDate: 1 }).lean();
    const reg    = trendsService.analyzeCycleRegularity(cycles);
    return res.json({
      success: true,
      data: { comparison: trendsService.buildCycleComparison(cycles, n), regularity: reg, yAxis: '0 – 35', note: `Average ${reg.avgLength} days — ${reg.label} cycle` },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getRegularity = async (req, res) => {
  try {
    const cycles = await CycleEntry.find({ userId: req.user.id }).sort({ startDate: 1 }).lean();
    return res.json({ success: true, data: trendsService.analyzeCycleRegularity(cycles) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getSleepTrend = async (req, res) => {
  try {
    const aggregated = await SensorReading.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: "$date", sleepHours: { $avg: "$sleepHours" }, sleepDisturbances: { $avg: "$sleepDisturbances" } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", sleepHours: 1, sleepDisturbances: 1, _id: 0 } }
    ]);
    const readings = fillDailyGaps(aggregated, 7);
    return res.json({ success: true, data: { trend: trendsService.buildSleepTrend(readings), xAxis: 'Days 1–28', yAxis: 'Hours' } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getTemperatureTrend = async (req, res) => {
  try {
    const aggregated = await SensorReading.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: "$date", temperature: { $avg: "$temperature" } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", temperature: 1, _id: 0 } }
    ]);
    const readings = fillDailyGaps(aggregated, 28);
    const trend    = trendsService.buildTemperatureTrend(readings);
    return res.json({ success: true, data: { ...trend, xAxis: 'Date', yAxis: 'Temp (°C)', baselineNote: `Basal body temperature line ${trend.baseline} (28 days)` } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getPatterns = async (req, res) => {
  try {
    const cycles   = await CycleEntry.find({ userId: req.user.id }).sort({ startDate: 1 }).lean();
    const readings = await SensorReading.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      { $group: { _id: "$date", heartRate: { $avg: "$heartRate" }, temperature: { $avg: "$temperature" }, sleepHours: { $avg: "$sleepHours" } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", heartRate: 1, temperature: 1, sleepHours: 1, _id: 0 } }
    ]);
    return res.json({ success: true, data: { patterns: trendsService.identifyRecurringPatterns(cycles, readings) } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
