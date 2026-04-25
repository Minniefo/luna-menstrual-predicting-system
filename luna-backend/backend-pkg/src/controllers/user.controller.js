/**
 * User Controller — MongoDB
 */
const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user: user.toSafeJSON() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, age } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(fullName && { fullName }), ...(age !== undefined && { age }) },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'Profile updated', user: user.toSafeJSON() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCycleSettings = async (req, res) => {
  try {
    const { cycleLength, periodLength, lastPeriodStart } = req.body;
    const patch = {};
    if (cycleLength)     patch.cycleLength     = cycleLength;
    if (periodLength)    patch.periodLength    = periodLength;
    if (lastPeriodStart) patch.lastPeriodStart = lastPeriodStart;
    const user = await User.findByIdAndUpdate(req.user.id, patch, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, message: 'Cycle settings updated', user: user.toSafeJSON() });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateSensors = async (req, res) => {
  try {
    const { heartRate, temperature, sleep } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (heartRate   !== undefined) user.sensors.heartRate   = !!heartRate;
    if (temperature !== undefined) user.sensors.temperature = !!temperature;
    if (sleep       !== undefined) user.sensors.sleep       = !!sleep;
    await user.save();
    return res.json({ success: true, message: 'Sensor settings updated', sensors: user.sensors });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateConditions = async (req, res) => {
  try {
    const { conditions } = req.body;
    if (!Array.isArray(conditions))
      return res.status(400).json({ success: false, message: 'conditions must be an array' });
    const user = await User.findByIdAndUpdate(req.user.id, { conditions }, { new: true });
    return res.json({ success: true, message: 'Conditions updated', conditions: user.conditions });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getInternalContext = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ 
      success: true, 
      user: {
        id: user._id,
        cycleLength: user.cycleLength,
        lastPeriodStart: user.lastPeriodStart
      }
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};
