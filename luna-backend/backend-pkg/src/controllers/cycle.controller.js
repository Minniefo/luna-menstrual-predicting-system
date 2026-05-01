/**
 * Cycle Controller — MongoDB
 */
const User        = require('../models/User');
const CycleEntry  = require('../models/CycleEntry');
const SensorReading = require('../models/SensorReading');
const cycleService  = require('../services/cycle.service');

// ── Overview ──────────────────────────────────────────────────────────────────
exports.getOverview = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();

    let mlPrediction = null;
    try {
      console.log(`[Wearable Backend Integration] Bypassing async Edge ML poll. Edge pushes state automatically.`);
      // In Option A, prediction data shouldn't be polled on the fly from the Edge API.
      // It arrives asynchronously. If we need strict sync, we pull the cached
      // state from MongoDB instead of triggering the python model.
    } catch (mlErr) {
      console.error(`[Wearable Backend Integration] Failure during API transition. Details:`, mlErr.message);
    }

    const overviewData = cycleService.buildCycleOverview(user, readings, mlPrediction);
    return res.json({ success: true, data: overviewData });
  } catch (err) { 
    console.error(`[Controller Error] GET /api/cycle/overview:`, err.stack);
    return res.status(500).json({ success: false, message: err.message }); 
  }
};

// ── Current phase ─────────────────────────────────────────────────────────────
exports.getPhase = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const cycleDay  = cycleService.getCycleDay(user.lastPeriodStart);
    const phaseInfo = cycleService.getPhaseForDay(cycleDay, user.cycleLength);
    return res.json({ success: true, data: { cycleDay, cycleLength: user.cycleLength, ...phaseInfo } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ── Prediction ────────────────────────────────────────────────────────────────
exports.getPrediction = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();
    const { refinedNextPeriod, confidence, signals } =
      cycleService.refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
    return res.json({
      success: true,
      data: {
        nextPeriodDate: refinedNextPeriod.toISOString().split('T')[0],
        daysRemaining:  cycleService.daysUntilNextPeriod(refinedNextPeriod),
        accuracy:       `${Math.min(99, Math.round(confidence * 100))}%`,
        signals,
        lastPeriodStart: user.lastPeriodStart,
        cycleLength:     user.cycleLength,
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ── Calendar ──────────────────────────────────────────────────────────────────
exports.getCalendar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const y = parseInt(req.query.year)  || new Date().getFullYear();
    const m = parseInt(req.query.month) || new Date().getMonth() + 1;
    const daysInMonth   = new Date(y, m, 0).getDate();
    const lastPeriodStart = new Date(user.lastPeriodStart);
    const nextDate      = cycleService.predictNextPeriod(user.lastPeriodStart, user.cycleLength);
    const ovulation     = cycleService.calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);
    const todayStr      = new Date().toISOString().split('T')[0];

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(y, m - 1, d);
      const dateStr = date.toISOString().split('T')[0];
      const diffDays  = Math.floor((date - lastPeriodStart) / 86400000);
      const cycleDay  = ((diffDays % user.cycleLength) + user.cycleLength) % user.cycleLength + 1;
      const phaseInfo = cycleService.getPhaseForDay(cycleDay, user.cycleLength);
      
      const isFuture    = dateStr > todayStr;
      const isBasePeriod = cycleDay <= user.periodLength;
      const isBaseOvu    = dateStr === ovulation.ovulationDate.toISOString().split('T')[0];
      const isBaseFert   = dateStr >= ovulation.fertileStart.toISOString().split('T')[0] &&
                           dateStr <= ovulation.fertileEnd.toISOString().split('T')[0];

      days.push({
        date: dateStr, day: d, cycleDay,
        phase: phaseInfo.phase, color: phaseInfo.color,
        isToday:     dateStr === todayStr,
        isPeriod:    isBasePeriod && !isFuture, // Past or current period
        isOvulation: isBaseOvu    && !isFuture,
        isFertile:   isBaseFert   && !isFuture,
        isPredicted: isFuture && (isBasePeriod || isBaseOvu || isBaseFert), // Future projected dates
        predictedType: isFuture ? (isBasePeriod ? 'period' : (isBaseOvu ? 'ovulation' : (isBaseFert ? 'fertile' : null))) : null
      });
    }

    return res.json({
      success: true,
      data: {
        year: y, month: m, days,
        legend: [
          { label: 'Period',         color: '#E91E63' },
          { label: 'Ovulation',      color: '#FF9800' },
          { label: 'Fertile window', color: '#8BC34A' },
          { label: 'Predicted',      color: '#9E9E9E' },
        ],
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ── History ───────────────────────────────────────────────────────────────────
exports.getCycleHistory = async (req, res) => {
  try {
    const cycles = await CycleEntry.find({ userId: req.user.id }).sort({ startDate: -1 }).lean();
    return res.json({ success: true, data: { cycles, total: cycles.length } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ── Log period ────────────────────────────────────────────────────────────────
exports.logPeriod = async (req, res) => {
  try {
    const { startDate, endDate, notes } = req.body;
    if (!startDate) return res.status(400).json({ success: false, message: 'startDate is required' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prev = await CycleEntry.findOne({ userId: user._id }).sort({ startDate: -1 });
    const duration = prev
      ? Math.round((new Date(startDate) - new Date(prev.startDate)) / 86400000)
      : user.cycleLength;

    const entry = await CycleEntry.create({
      userId:       user._id,
      startDate,
      endDate:      endDate || null,
      duration,
      periodLength: endDate
        ? Math.round((new Date(endDate) - new Date(startDate)) / 86400000)
        : user.periodLength,
      notes: notes || '',
    });

    await User.findByIdAndUpdate(user._id, { lastPeriodStart: startDate });
    return res.status(201).json({ success: true, message: 'Period logged', data: entry });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ── Ovulation ─────────────────────────────────────────────────────────────────
exports.getOvulationWindow = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const ov = cycleService.calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);
    return res.json({
      success: true,
      data: {
        ovulationDate: ov.ovulationDate.toISOString().split('T')[0],
        fertileStart:  ov.fertileStart.toISOString().split('T')[0],
        fertileEnd:    ov.fertileEnd.toISOString().split('T')[0],
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
