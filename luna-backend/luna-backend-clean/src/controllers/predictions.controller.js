/**
 * Predictions Controller
 * ───────────────────────
 * GET /api/predictions/next-period     – refined next period date
 * GET /api/predictions/ovulation       – ovulation window
 * GET /api/predictions/phase-timeline  – full phase timeline
 * GET /api/predictions/confidence      – prediction confidence score
 */

const { store }      = require('../utils/mock-store');
const cycleService   = require('../services/cycle.service');
const alertsService  = require('../services/alerts.service');

// ── Next period prediction ────────────────────────────────────────────────────
exports.getNextPeriod = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const { refinedNextPeriod, confidence, signals } =
    cycleService.refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const days = cycleService.daysUntilNextPeriod(refinedNextPeriod);

  return res.json({
    success: true,
    data: {
      nextPeriodDate:  refinedNextPeriod.toISOString().split('T')[0],
      daysRemaining:   days,
      accuracy:        `${Math.round(confidence * 100)}%`,
      confidenceScore: confidence,
      signals,
    },
  });
};

// ── Ovulation window ──────────────────────────────────────────────────────────
exports.getOvulationWindow = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
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
};

// ── Full phase timeline ───────────────────────────────────────────────────────
exports.getPhaseTimeline = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const start = new Date(user.lastPeriodStart);
  const phases = [];
  let day = 1;

  const segments = [
    { name: 'Menstrual',  days: user.periodLength,                emoji: '🔴', color: '#E91E63' },
    { name: 'Follicular', days: user.cycleLength - user.periodLength - 14 - 2, emoji: '🌱', color: '#4CAF50' },
    { name: 'Ovulation',  days: 3,                                emoji: '⭐', color: '#FF9800' },
    { name: 'Luteal',     days: 14,                               emoji: '🌙', color: '#9C27B0' },
  ];

  for (const seg of segments) {
    const segStart = new Date(start);
    segStart.setDate(start.getDate() + day - 1);
    const segEnd = new Date(segStart);
    segEnd.setDate(segStart.getDate() + seg.days - 1);

    const cycleDay = cycleService.getCycleDay(user.lastPeriodStart);
    const isActive = cycleDay >= day && cycleDay < day + seg.days;

    phases.push({
      phase: seg.name,
      emoji: seg.emoji,
      color: seg.color,
      startDay: day,
      endDay: day + seg.days - 1,
      startDate: segStart.toISOString().split('T')[0],
      endDate: segEnd.toISOString().split('T')[0],
      isActive,
      isYouAreHere: isActive,
    });
    day += seg.days;
  }

  return res.json({ success: true, data: { phases, currentDay: cycleService.getCycleDay(user.lastPeriodStart) } });
};

// ── Confidence score breakdown ────────────────────────────────────────────────
exports.getConfidence = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const { confidence, signals } =
    cycleService.refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  return res.json({
    success: true,
    data: {
      score:   confidence,
      percent: `${Math.round(confidence * 100)}%`,
      signals,
      dataPoints: readings.length,
      note: readings.length < 7
        ? 'Sync more wearable data to improve prediction accuracy'
        : 'Prediction based on wearable physiological data',
    },
  });
};
