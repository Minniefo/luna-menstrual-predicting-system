/**
 * Cycle Controller
 * ─────────────────
 * GET  /api/cycle/overview          – full cycle dashboard data
 * GET  /api/cycle/phase             – current phase
 * GET  /api/cycle/prediction        – next period prediction
 * GET  /api/cycle/calendar          – calendar data for month
 * GET  /api/cycle/history           – all logged cycles
 * POST /api/cycle/log               – log a new period start
 * GET  /api/cycle/ovulation         – ovulation window
 */

const { store }       = require('../utils/mock-store');
const cycleService    = require('../services/cycle.service');
const { uuid }        = require('../utils/mock-store');

// ── Overview ──────────────────────────────────────────────────────────────────
exports.getOverview = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const overview = cycleService.buildCycleOverview(user, readings);
  return res.json({ success: true, data: overview });
};

// ── Current phase ─────────────────────────────────────────────────────────────
exports.getPhase = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const cycleDay  = cycleService.getCycleDay(user.lastPeriodStart);
  const phaseInfo = cycleService.getPhaseForDay(cycleDay, user.cycleLength);
  return res.json({ success: true, data: { cycleDay, cycleLength: user.cycleLength, ...phaseInfo } });
};

// ── Next period prediction ────────────────────────────────────────────────────
exports.getPrediction = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const { refinedNextPeriod, confidence, signals } = cycleService.refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const days = cycleService.daysUntilNextPeriod(refinedNextPeriod);
  return res.json({
    success: true,
    data: {
      nextPeriodDate: refinedNextPeriod.toISOString().split('T')[0],
      daysRemaining: days,
      accuracy: `${Math.round(confidence * 100)}%`,
      signals,
      lastPeriodStart: user.lastPeriodStart,
      cycleLength: user.cycleLength,
    },
  });
};

// ── Calendar data ─────────────────────────────────────────────────────────────
exports.getCalendar = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { year, month } = req.query;
  const y = parseInt(year)  || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;

  const daysInMonth = new Date(y, m, 0).getDate();
  const lastPeriodStart = new Date(user.lastPeriodStart);

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m - 1, d);
    const dateStr = date.toISOString().split('T')[0];

    // Diff from last period start
    const diffDays = Math.floor((date - lastPeriodStart) / 86400000);
    const cycleDay = ((diffDays % user.cycleLength) + user.cycleLength) % user.cycleLength + 1;
    const phaseInfo = cycleService.getPhaseForDay(cycleDay, user.cycleLength);

    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const isPeriod = cycleDay <= user.periodLength;
    const nextDate = cycleService.predictNextPeriod(user.lastPeriodStart, user.cycleLength);
    const isPredicted = dateStr === nextDate.toISOString().split('T')[0];
    const ovulation   = cycleService.calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);
    const isFertile   = dateStr >= ovulation.fertileStart.toISOString().split('T')[0] &&
                        dateStr <= ovulation.fertileEnd.toISOString().split('T')[0];
    const isOvulation = dateStr === ovulation.ovulationDate.toISOString().split('T')[0];

    days.push({
      date: dateStr,
      day: d,
      cycleDay,
      phase: phaseInfo.phase,
      color: phaseInfo.color,
      isToday,
      isPeriod,
      isOvulation,
      isFertile,
      isPredicted,
    });
  }

  const legend = [
    { label: 'Period',         color: '#E91E63' },
    { label: 'Ovulation',      color: '#FF9800' },
    { label: 'Fertile window', color: '#8BC34A' },
    { label: 'Predicted',      color: '#9E9E9E' },
  ];

  return res.json({ success: true, data: { year: y, month: m, days, legend } });
};

// ── History of all logged cycles ──────────────────────────────────────────────
exports.getCycleHistory = (req, res) => {
  const cycles = store.cyclesFor(req.user.id);
  return res.json({ success: true, data: { cycles, total: cycles.length } });
};

// ── Log new period ────────────────────────────────────────────────────────────
exports.logPeriod = (req, res) => {
  const { startDate, endDate, notes } = req.body;
  if (!startDate) return res.status(400).json({ success: false, message: 'startDate is required' });

  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Calculate duration from previous entry
  const history = store.cyclesFor(user.id).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const prev = history[history.length - 1];
  const duration = prev
    ? Math.round((new Date(startDate) - new Date(prev.startDate)) / 86400000)
    : user.cycleLength;

  const entry = store.addCycle({
    id: uuid(),
    userId: user.id,
    startDate,
    endDate: endDate || null,
    duration,
    periodLength: endDate ? Math.round((new Date(endDate) - new Date(startDate)) / 86400000) : user.periodLength,
    notes: notes || '',
    phase: 'menstrual',
    createdAt: new Date(),
  });

  // Update user's lastPeriodStart
  store.updateUser(user.id, { lastPeriodStart: startDate });

  return res.status(201).json({ success: true, message: 'Period logged', data: entry });
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
