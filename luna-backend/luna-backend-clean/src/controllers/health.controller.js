/**
 * Health Insights Controller
 * ───────────────────────────
 * GET /api/health/snapshot       – full health dashboard
 * GET /api/health/heart-rate     – HR trend (past N days)
 * GET /api/health/temperature    – BBT trend
 * GET /api/health/sleep          – sleep quality trend
 * GET /api/health/insights       – natural-language insights text
 * GET /api/health/status         – overall health status card
 */

const { store }       = require('../utils/mock-store');
const healthService   = require('../services/health.service');

const getReadings = (userId, days = 14) => {
  const all = store.readingsFor(userId);
  return all.slice(-days);
};

// ── Full health snapshot ──────────────────────────────────────────────────────
exports.getSnapshot = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings  = getReadings(user.id, 14);
  const snapshot  = healthService.buildHealthSnapshot(user, readings);
  return res.json({ success: true, data: snapshot });
};

// ── Heart rate trend ──────────────────────────────────────────────────────────
exports.getHeartRate = (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const readings = getReadings(req.user.id, days);
  const analysis = healthService.analyzeHeartRate(readings);
  const trend    = readings.map(r => ({ date: r.date, bpm: r.heartRate }));
  return res.json({ success: true, data: { analysis, trend, period: `Past ${days} days`, yAxisLabel: '60–100 bpm' } });
};

// ── Temperature trend ─────────────────────────────────────────────────────────
exports.getTemperature = (req, res) => {
  const days = parseInt(req.query.days) || 14;
  const readings = getReadings(req.user.id, days);
  const analysis = healthService.analyzeTemperature(readings);
  const trend    = readings.map(r => ({ date: r.date, temp: r.temperature }));
  return res.json({
    success: true,
    data: {
      analysis,
      trend,
      period: `Past ${days} days`,
      yAxisLabel: '36.2–37.2 °C',
      baseline: 36.7,
    },
  });
};

// ── Sleep quality trend ───────────────────────────────────────────────────────
exports.getSleep = (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const readings = getReadings(req.user.id, days);
  const analysis = healthService.analyzeSleep(readings);
  return res.json({
    success: true,
    data: {
      analysis,
      legend: [
        { label: 'Good',  color: '#4CAF50' },
        { label: 'Fair',  color: '#FF9800' },
        { label: 'Poor',  color: '#F44336', range: '0–8 disturbances' },
      ],
    },
  });
};

// ── Natural-language health insights ─────────────────────────────────────────
exports.getInsights = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings   = getReadings(user.id, 7);
  const snapshot   = healthService.buildHealthSnapshot(user, readings);
  return res.json({ success: true, data: { insights: snapshot.insights, phase: snapshot.currentPhase } });
};

// ── Overall health status card ────────────────────────────────────────────────
exports.getStatus = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = getReadings(user.id, 7);
  const hr       = healthService.analyzeHeartRate(readings);
  const temp     = healthService.analyzeTemperature(readings);
  const sleep    = healthService.analyzeSleep(readings);
  const overall  = healthService.computeOverallHealth(hr, temp, sleep);
  const { getPhaseForDay, getCycleDay } = require('../services/cycle.service');
  const phase = getPhaseForDay(getCycleDay(user.lastPeriodStart), user.cycleLength);
  return res.json({
    success: true,
    data: {
      overallHealth: overall,
      phase: phase.phase,
      cycleDay: getCycleDay(user.lastPeriodStart),
      indicators: {
        heartRate:   { value: hr?.current,              label: hr?.classification?.label   || 'N/A' },
        temperature: { value: temp?.current,            label: temp?.classification?.label || 'N/A' },
        sleep:       { value: sleep?.current?.quality?.label, label: sleep?.current?.quality?.label || 'N/A' },
      },
    },
  });
};
