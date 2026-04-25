const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/users',       require('./routes/user.routes'));
app.use('/api/cycle',       require('./routes/cycle.routes'));
app.use('/api/health',      require('./routes/health.routes'));
app.use('/api/alerts',      require('./routes/alerts.routes'));
app.use('/api/trends',      require('./routes/trends.routes'));
app.use('/api/medicines',   require('./routes/medicines.routes'));
app.use('/api/wearable',    require('./routes/wearable.routes'));
app.use('/api/predictions', require('./routes/predictions.routes'));

// ── Health check ────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'Luna API is running', version: '1.0.0', timestamp: new Date() });
});

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌙 Luna API running on port ${PORT}`);
});

module.exports = app;
