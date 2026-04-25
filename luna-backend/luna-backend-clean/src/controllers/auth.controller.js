/**
 * Auth Controller
 * ───────────────
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 */

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { store, uuid } = require('../utils/mock-store');

const JWT_SECRET         = process.env.JWT_SECRET          || 'luna_dev_secret';
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN      || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'luna_refresh_secret';
const JWT_REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signAccess = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const signRefresh = (user) =>
  jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXP });

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = (req, res) => {
  const { name, email, password, age, cycleLength, periodLength } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'name, email and password are required' });
  }
  if (store.findUser(u => u.email === email)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const today = new Date().toISOString().split('T')[0];
  const user  = store.addUser({
    id: uuid(),
    name,
    email,
    password: hash,
    age: age || null,
    cycleLength: cycleLength || 28,
    periodLength: periodLength || 5,
    lastPeriodStart: today,
    conditions: [],
    sensors: { heartRate: true, temperature: true, sleep: true },
    createdAt: new Date(),
  });
  const { password: _p, ...safe } = user;
  return res.status(201).json({
    success: true,
    message: 'Account created',
    user: safe,
    token: signAccess(user),
    refreshToken: signRefresh(user),
  });
};

// ── Login ────────────────────────────────────────────────────────────────────
exports.login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required' });
  }
  const user = store.findUser(u => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  const { password: _p, ...safe } = user;
  return res.json({
    success: true,
    message: 'Login successful',
    user: safe,
    token: signAccess(user),
    refreshToken: signRefresh(user),
  });
};

// ── Refresh token ─────────────────────────────────────────────────────────────
exports.refresh = (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user    = store.findUser(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, token: signAccess(user) });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ── Logout (client just discards token; here we acknowledge) ──────────────────
exports.logout = (_req, res) => {
  return res.json({ success: true, message: 'Logged out successfully' });
};
