/**
 * Alerts & Predictions Controller — MongoDB
 */
const User          = require('../models/User');
const Alert         = require('../models/Alert');
const SensorReading = require('../models/SensorReading');
const alertsService = require('../services/alerts.service');

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { alerts, total: alerts.length } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getUnread = async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id, isRead: false }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { alerts, count: alerts.length } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.evaluate = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();
    const generated = await alertsService.evaluateAllAlerts(user, readings);
    return res.json({ success: true, message: `${generated.length} alert(s) generated`, data: { generated } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.markRead = async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    return res.json({ success: true, message: 'Alert marked as read', data: alert });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await Alert.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    return res.json({ success: true, message: 'All alerts marked as read' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getPredictionSummary = async (req, res) => {
  try {
    const user     = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const readings = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();
    return res.json({ success: true, data: alertsService.buildPredictionSummary(user, readings) });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, data: user.notificationPrefs });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updatePreferences = async (req, res) => {
  try {
    const allowed = ['periodReminder','ovulationAlert','temperatureSpike','sleepDisturbance','morningCheckin'];
    const user    = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    for (const key of allowed) {
      if (req.body[key] !== undefined) user.notificationPrefs[key] = !!req.body[key];
    }
    user.markModified('notificationPrefs');
    await user.save();
    return res.json({ success: true, message: 'Preferences updated', data: user.notificationPrefs });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    return res.json({ success: true, message: 'Alert dismissed' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
