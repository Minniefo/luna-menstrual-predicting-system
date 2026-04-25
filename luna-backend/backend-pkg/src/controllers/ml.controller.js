/**
 * ML Prediction Controller  v2.0.0
 * ──────────────────────────────────
 * Bridges Node.js API ↔ Python Flask ML microservice.
 * Model trained on real mcPHASES dataset (42 subjects).
 *
 * POST /api/ml/predict              – manual single prediction
 * POST /api/ml/predict/batch        – manual batch prediction
 * GET  /api/ml/predict/auto         – predict from user's Luna DB sensor readings
 * GET  /api/ml/predict/from-wearable – predict from raw wearable_iot.readings (ESP32)
 * GET  /api/ml/model/info           – model metadata
 * GET  /api/ml/health               – ML service health check
 */

const axios         = require('axios');
const User          = require('../models/User');
const SensorReading = require('../models/SensorReading');
const { getCycleDay, getPhaseForDay } = require('../services/cycle.service');

const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const WEARABLE_BASE = process.env.WEARABLE_API_URL || 'http://localhost:3000';

const mlPost = (path, body) =>
  axios.post(`${ML_BASE}${path}`, body, { timeout: 15000 }).then(r => r.data);
const mlGet  = (path, params = {}) =>
  axios.get(`${ML_BASE}${path}`, { params, timeout: 10000 }).then(r => r.data);
const wearablePost = (path, body) =>
  axios.post(`${WEARABLE_BASE}${path}`, body, { timeout: 15000 }).then(r => r.data);

// ── Phase mapping: Luna phase name → mcPHASES phase name ─────────────────────
const LUNA_TO_MCPHASES = {
  Menstrual:  'Menstrual',
  Follicular: 'Follicular',
  Ovulation:  'Fertility',
  Luteal:     'Luteal',
};

// ── Health check ──────────────────────────────────────────────────────────────
exports.health = async (_req, res) => {
  try {
    const data = await mlGet('/');
    return res.json({ success: true, ml_service: data });
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'ML service unavailable. Start the Python Flask service on port 5001.',
      error: err.message,
    });
  }
};

// ── Manual single prediction ──────────────────────────────────────────────────
exports.predict = async (req, res) => {
  try {
    return res.json(await mlPost('/predict', req.body));
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(503).json({ success: false, message: 'ML service unavailable', error: err.message });
  }
};

// ── Manual batch prediction ───────────────────────────────────────────────────
exports.predictBatch = async (req, res) => {
  try {
    return res.json(await mlPost('/predict/batch', req.body));
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(503).json({ success: false, message: 'ML service unavailable', error: err.message });
  }
};

// ── Auto predict from Luna DB SensorReadings ──────────────────────────────────
exports.predictAuto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const readings = await SensorReading
      .find({ userId: user._id })
      .sort({ date: 1 })
      .limit(30)
      .lean();

    if (readings.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient data for ML. Need at least 3 days of readings.',
      });
    }

    // Prepare batch data for Flask /predict/batch
    const formattedReadings = readings.map(r => ({
      hr_mean: r.heartRate || 70,
      temp_mean: (r.temperature || 36.6) - 36.6, // temp diff from baseline
      sleep_disturbance_score: (r.sleepDisturbances || 0) / 10,
      cycle_progress: Math.floor((new Date(r.date) - new Date(user.lastPeriodStart)) / (1000 * 60 * 60 * 24))
    }));

    const mlResponse = await mlPost('/predict/batch', { readings: formattedReadings });

    if (mlResponse.success && mlResponse.summary) {
      const { any_period_soon, highest_risk_day } = mlResponse.summary;
      
      const prediction = highest_risk_day.label || (any_period_soon ? "Period likely soon" : "No immediate indication");
      const confidence = highest_risk_day.probability;
      const timestamp  = new Date();

      // Update User object with latest inference using atomic update to bypass unrelated field validation
      await User.findByIdAndUpdate(user._id, {
        "mlPredictionState.prediction": prediction,
        "mlPredictionState.confidence": confidence,
        "mlPredictionState.timestamp": timestamp
      });

      return res.json({
        success: true,
        source: 'Luna ML Service (In-App Inference)',
        prediction: prediction,
        confidence: confidence,
        summary: mlResponse.summary,
        timestamp: timestamp
      });
    }

    return res.status(500).json({ success: false, message: 'ML service failed to return summary' });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Predict directly from wearable_iot.readings (ESP32 raw data) ─────────────
exports.predictFromWearable = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const readings = await SensorReading.find({ userId: user._id }).sort({ date: -1 }).limit(1).lean();
    if (!readings.length) return res.status(400).json({ success: false, message: 'No data' });

    const latest = readings[0];
    const params = {
      hr_mean: latest.heartRate,
      temp_mean: latest.temperature - 36.6,
      sleep_disturbance_score: latest.sleepDisturbances / 10,
      cycle_progress: Math.floor((new Date(latest.date) - new Date(user.lastPeriodStart)) / (1000 * 60 * 60 * 24))
    };

    const data = await mlPost('/predict', params);
    return res.json({ ...data, luna_user_id: user._id });
  } catch (err) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    return res.status(503).json({ success: false, message: 'ML service unavailable', error: err.message });
  }
};

// ── Model info ────────────────────────────────────────────────────────────────
exports.modelInfo = async (_req, res) => {
  try {
    return res.json({
      success: true,
      model: {
        architecture: "Option A Python Edge IoT",
        status: "Online",
        version: "2.0"
      }
    });
  } catch (err) {
    return res.status(503).json({ success: false, message: 'ML service unavailable', error: err.message });
  }
};
