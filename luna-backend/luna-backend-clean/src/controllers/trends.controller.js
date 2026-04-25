/**
 * Trends & Analytics Controller
 * ───────────────────────────────
 * GET /api/trends/overview           – full trend dashboard
 * GET /api/trends/cycle-duration     – cycle duration trend chart
 * GET /api/trends/cycle-comparison   – bar chart comparison data
 * GET /api/trends/regularity         – regularity analysis
 * GET /api/trends/sleep              – long-term sleep trend
 * GET /api/trends/temperature        – long-term temperature trend
 * GET /api/trends/patterns           – recurring pattern insights
 */

const { store }      = require('../utils/mock-store');
const trendsService  = require('../services/trends.service');

// ── Full trends overview ──────────────────────────────────────────────────────
exports.getOverview = (req, res) => {
  const user     = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const cycles   = store.cyclesFor(user.id);
  const readings = store.readingsFor(user.id);
  const overview = trendsService.buildTrendOverview(cycles, readings);
  return res.json({ success: true, data: overview });
};

// ── Cycle duration trend (line chart) ────────────────────────────────────────
exports.getCycleDurationTrend = (req, res) => {
  const cycles = store.cyclesFor(req.user.id);
  const data   = trendsService.buildCycleDurationTrend(cycles);
  return res.json({ success: true, data: { trend: data, xAxis: 'Month', yAxis: 'Duration (days)' } });
};

// ── Cycle comparison (bar chart) ──────────────────────────────────────────────
exports.getCycleComparison = (req, res) => {
  const n      = parseInt(req.query.n) || 6;
  const cycles = store.cyclesFor(req.user.id);
  const data   = trendsService.buildCycleComparison(cycles, n);
  const regularity = trendsService.analyzeCycleRegularity(cycles);
  return res.json({
    success: true,
    data: {
      comparison: data,
      regularity,
      yAxis: '0 – 35',
      note: `Average ${regularity.avgLength} days — ${regularity.label} cycle`,
    },
  });
};

// ── Regularity analysis ───────────────────────────────────────────────────────
exports.getRegularity = (req, res) => {
  const cycles = store.cyclesFor(req.user.id);
  const result = trendsService.analyzeCycleRegularity(cycles);
  return res.json({ success: true, data: result });
};

// ── Long-term sleep trend ─────────────────────────────────────────────────────
exports.getSleepTrend = (req, res) => {
  const readings = store.readingsFor(req.user.id);
  const trend    = trendsService.buildSleepTrend(readings);
  return res.json({ success: true, data: { trend, xAxis: 'Days 1–28', yAxis: 'Hours' } });
};

// ── Long-term temperature trend ───────────────────────────────────────────────
exports.getTemperatureTrend = (req, res) => {
  const user     = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const trend    = trendsService.buildTemperatureTrend(readings);
  return res.json({
    success: true,
    data: {
      ...trend,
      xAxis: 'Date',
      yAxis: 'Temp (°C)',
      baselineNote: `Basal body temperature line ${trend.baseline} (28 days)`,
      label: 'Dashed cover line 36.7',
    },
  });
};

// ── Recurring patterns ────────────────────────────────────────────────────────
exports.getPatterns = (req, res) => {
  const cycles   = store.cyclesFor(req.user.id);
  const readings = store.readingsFor(req.user.id);
  const patterns = trendsService.identifyRecurringPatterns(cycles, readings);
  return res.json({ success: true, data: { patterns } });
};
