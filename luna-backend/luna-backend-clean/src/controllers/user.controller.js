/**
 * User Controller
 * ───────────────
 * GET    /api/users/profile
 * PUT    /api/users/profile
 * PUT    /api/users/cycle-settings
 * PUT    /api/users/sensors
 * PUT    /api/users/conditions
 * DELETE /api/users/account
 */

const { store } = require('../utils/mock-store');

const safeUser = (u) => { const { password: _p, ...s } = u; return s; };

// ── Get profile ───────────────────────────────────────────────────────────────
exports.getProfile = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, user: safeUser(user) });
};

// ── Update profile ────────────────────────────────────────────────────────────
exports.updateProfile = (req, res) => {
  const { name, age } = req.body;
  const updated = store.updateUser(req.user.id, { ...(name && { name }), ...(age && { age }) });
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, message: 'Profile updated', user: safeUser(updated) });
};

// ── Update cycle settings ─────────────────────────────────────────────────────
exports.updateCycleSettings = (req, res) => {
  const { cycleLength, periodLength, lastPeriodStart } = req.body;
  const patch = {};
  if (cycleLength)     patch.cycleLength = cycleLength;
  if (periodLength)    patch.periodLength = periodLength;
  if (lastPeriodStart) patch.lastPeriodStart = lastPeriodStart;
  const updated = store.updateUser(req.user.id, patch);
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  return res.json({ success: true, message: 'Cycle settings updated', user: safeUser(updated) });
};

// ── Update sensor toggles ─────────────────────────────────────────────────────
exports.updateSensors = (req, res) => {
  const { heartRate, temperature, sleep } = req.body;
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const sensors = {
    heartRate:   heartRate   !== undefined ? !!heartRate   : user.sensors.heartRate,
    temperature: temperature !== undefined ? !!temperature : user.sensors.temperature,
    sleep:       sleep       !== undefined ? !!sleep       : user.sensors.sleep,
  };
  const updated = store.updateUser(req.user.id, { sensors });
  return res.json({ success: true, message: 'Sensor settings updated', sensors: updated.sensors });
};

// ── Update health conditions ──────────────────────────────────────────────────
exports.updateConditions = (req, res) => {
  const { conditions } = req.body;
  if (!Array.isArray(conditions)) {
    return res.status(400).json({ success: false, message: 'conditions must be an array' });
  }
  const updated = store.updateUser(req.user.id, { conditions });
  return res.json({ success: true, message: 'Health conditions updated', conditions: updated.conditions });
};

// ── Delete account ────────────────────────────────────────────────────────────
exports.deleteAccount = (req, res) => {
  // In a real system we'd soft-delete. Here we signal success.
  return res.json({ success: true, message: 'Account deletion requested. All data will be removed within 24 h.' });
};
