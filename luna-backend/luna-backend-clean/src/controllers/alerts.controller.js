/**
 * Alerts & Predictions Controller
 * ─────────────────────────────────
 * GET  /api/alerts                   – all alerts for user
 * GET  /api/alerts/unread            – unread alerts only
 * POST /api/alerts/evaluate          – trigger alert evaluation now
 * PUT  /api/alerts/:id/read          – mark one alert read
 * PUT  /api/alerts/read-all          – mark all alerts read
 * GET  /api/alerts/prediction        – prediction summary panel
 * GET  /api/alerts/preferences       – get notification preferences
 * PUT  /api/alerts/preferences       – update notification preferences
 * DELETE /api/alerts/:id             – dismiss / delete an alert
 */

const { store }        = require('../utils/mock-store');
const alertsService    = require('../services/alerts.service');

// ── All alerts ────────────────────────────────────────────────────────────────
exports.getAlerts = (req, res) => {
  const alerts = store.alertsFor(req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, data: { alerts, total: alerts.length } });
};

// ── Unread alerts ─────────────────────────────────────────────────────────────
exports.getUnread = (req, res) => {
  const alerts = store.alertsFor(req.user.id).filter(a => !a.isRead)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json({ success: true, data: { alerts, count: alerts.length } });
};

// ── Evaluate alerts ───────────────────────────────────────────────────────────
exports.evaluate = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const generated = alertsService.evaluateAllAlerts(user, readings);
  return res.json({
    success: true,
    message: `${generated.length} alert(s) generated`,
    data: { generated },
  });
};

// ── Mark one read ─────────────────────────────────────────────────────────────
exports.markRead = (req, res) => {
  const updated = store.markAlertRead(req.params.id);
  if (!updated) return res.status(404).json({ success: false, message: 'Alert not found' });
  return res.json({ success: true, message: 'Alert marked as read', data: updated });
};

// ── Mark all read ─────────────────────────────────────────────────────────────
exports.markAllRead = (req, res) => {
  store.markAllAlertsRead(req.user.id);
  return res.json({ success: true, message: 'All alerts marked as read' });
};

// ── Prediction summary ────────────────────────────────────────────────────────
exports.getPredictionSummary = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const readings = store.readingsFor(user.id);
  const summary  = alertsService.buildPredictionSummary(user, readings);
  return res.json({ success: true, data: summary });
};

// ── Get notification preferences ──────────────────────────────────────────────
exports.getPreferences = (req, res) => {
  const prefs = store.getPrefs(req.user.id);
  return res.json({ success: true, data: prefs });
};

// ── Update notification preferences ──────────────────────────────────────────
exports.updatePreferences = (req, res) => {
  const allowed = ['periodReminder', 'ovulationAlert', 'temperatureSpike', 'sleepDisturbance', 'morningCheckin'];
  const current = store.getPrefs(req.user.id);
  const updated = { ...current };
  for (const key of allowed) {
    if (req.body[key] !== undefined) updated[key] = !!req.body[key];
  }
  store.setPrefs(req.user.id, updated);
  return res.json({ success: true, message: 'Notification preferences updated', data: updated });
};

// ── Delete / dismiss an alert ─────────────────────────────────────────────────
exports.deleteAlert = (req, res) => {
  // In the mock store we just mark as read; in real DB we'd delete
  const updated = store.markAlertRead(req.params.id);
  if (!updated) return res.status(404).json({ success: false, message: 'Alert not found' });
  return res.json({ success: true, message: 'Alert dismissed' });
};
