/**
 * Auth Controller — MongoDB
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 */
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET         = process.env.JWT_SECRET          || 'luna_dev_secret';
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN      || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'luna_refresh_secret';
const JWT_REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signAccess  = (user) =>
  jwt.sign({ id: user._id, email: user.email, fullName: user.fullName }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
const signRefresh = (user) =>
  jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXP });

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, age, cycleLength, periodLength } = req.body;
    if (!fullName || !email || !password)
      return res.status(400).json({ success: false, message: 'fullName, email and password are required' });
    if (await User.findOne({ email }))
      return res.status(409).json({ success: false, message: 'Email already registered' });
    const user = await User.create({
      fullName, email, password,
      age: age || null, cycleLength: cycleLength || 28, periodLength: periodLength || 5,
      lastPeriodStart: new Date().toISOString().split('T')[0],
    });
    return res.status(201).json({
      success: true, message: 'Account created',
      user: user.toSafeJSON(), token: signAccess(user), refreshToken: signRefresh(user),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    // Development Mode: Bypass DB login
    if (process.env.DEV_MODE === 'true') {
      let devUser = await User.findOne({ email: 'dev@luna.test' });
      if (!devUser) {
        devUser = await User.create({
          fullName: 'Dev User', email: 'dev@luna.test', password: 'dev_password',
          age: 28, cycleLength: 28, periodLength: 5,
          lastPeriodStart: new Date().toISOString().split('T')[0],
        });
      }
      return res.json({
        success: true, message: 'DEV MODE: Login successful',
        user: devUser.toSafeJSON(), token: signAccess(devUser), refreshToken: signRefresh(devUser),
      });
    }

    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    return res.json({
      success: true, message: 'Login successful',
      user: user.toSafeJSON(), token: signAccess(user), refreshToken: signRefresh(user),
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, token: signAccess(user) });
  } catch { return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' }); }
};

exports.logout = (_req, res) => res.json({ success: true, message: 'Logged out successfully' });
