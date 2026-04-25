/**
 * Alerts & Predictions Service — MongoDB version
 */
const Alert        = require('../models/Alert');
const { daysUntilNextPeriod, predictNextPeriod, refineWithPhysiologicalData } = require('./cycle.service');
const { classifyHeartRate, detectOvulationShift, classifySleep } = require('./health.service');

// ── Alert factory ─────────────────────────────────────────────────────────────
const createAlert = async (userId, type, title, message, priority = 'medium') => {
  return Alert.create({ userId, type, title, message, priority });
};

// ── Check helpers ─────────────────────────────────────────────────────────────
const checkPeriodReminder = async (user, readings) => {
  if (!user.notificationPrefs?.periodReminder) return null;
  const { refinedNextPeriod } = refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const days = daysUntilNextPeriod(refinedNextPeriod);
  if ([1, 3, 7].includes(days)) {
    return createAlert(user._id, 'period_reminder', `Period in ${days} Day${days > 1 ? 's' : ''}`,
      `Your next period is predicted in ${days} day${days > 1 ? 's' : ''} — ${refinedNextPeriod.toDateString()}. Be prepared!`,
      days === 1 ? 'high' : 'medium');
  }
  return null;
};

const checkOvulationAlert = async (user, readings) => {
  if (!user.notificationPrefs?.ovulationAlert || readings.length < 5) return null;
  const shift = detectOvulationShift(readings);
  if (shift.detected) {
    return createAlert(user._id, 'ovulation_detected', 'Ovulation Detected',
      `BBT rose ${shift.shift} °C above baseline — peak fertility window. ${shift.message}`, 'high');
  }
  return null;
};

const checkTemperatureSpike = async (user, readings) => {
  if (!user.notificationPrefs?.temperatureSpike || !readings.length) return null;
  const latest = readings[readings.length - 1];
  if (latest?.temperature >= 37.5) {
    return createAlert(user._id, 'temperature_spike', 'Temperature Spike',
      `Body temperature recorded at ${latest.temperature} °C today — above normal. Monitor for fever.`, 'high');
  }
  return null;
};

const checkSleepDisturbance = async (user, readings) => {
  if (!user.notificationPrefs?.sleepDisturbance || !readings.length) return null;
  const latest  = readings[readings.length - 1];
  if (!latest) return null;
  const quality = classifySleep(latest.sleepHours, latest.sleepDisturbances);
  if (quality.status === 'poor') {
    return createAlert(user._id, 'sleep_disturbance', 'Poor Sleep Detected',
      `${latest.sleepDisturbances} disturbances detected last night (${latest.sleepHours}h sleep). Consider adjusting your bedtime routine.`, 'medium');
  }
  return null;
};

const checkHeartRateAlert = async (user, readings) => {
  if (!readings.length) return null;
  const latest = readings[readings.length - 1];
  const hr = classifyHeartRate(latest?.heartRate || 72);
  if (hr.status === 'high') {
    return createAlert(user._id, 'heart_rate_alert', 'Elevated Heart Rate',
      `Resting heart rate of ${latest.heartRate} bpm detected — above the normal range. Rest and monitor.`, 'high');
  }
  return null;
};

const checkMLPrediction = async (user, readings) => {
  if (!user.mlPredictionState || !user.mlPredictionState.prediction) return null;
  const state = user.mlPredictionState;

  // Only alert for high/med risk soon labels
  if (state.prediction.includes("likely within next few days") || state.prediction === "Period likely soon") {
    // Check if we already have a recent high-priority alert for this to avoid spam
    const existing = await Alert.findOne({
      userId: user._id,
      type: 'period_prediction',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    if (existing) return null;

    return createAlert(user._id, 'period_prediction', 'Edge ML: Period Soon',
      `Our ML model predicts: "${state.prediction}" with ${(state.confidence * 100).toFixed(0)}% confidence.`, 'high');
  }
  return null;
};

// ── Batch evaluation ──────────────────────────────────────────────────────────
const evaluateAllAlerts = async (user, readings) => {
  const generated = [];
  const checks = [
    checkPeriodReminder, 
    checkOvulationAlert, 
    checkTemperatureSpike, 
    checkSleepDisturbance, 
    checkHeartRateAlert,
    checkMLPrediction
  ];
  for (const check of checks) {
    try {
      const alert = await check(user, readings);
      if (alert) generated.push(alert);
    } catch (e) { console.error(`Alert check failed: ${check.name}`, e.message); }
  }
  return generated;
};

// ── Prediction summary ────────────────────────────────────────────────────────
const buildPredictionSummary = (user, readings) => {
  const { refinedNextPeriod, confidence, signals } = refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  let days = daysUntilNextPeriod(refinedNextPeriod);
  let accuracy = `${Math.round(confidence * 100)}%`;
  let finalDateStr = refinedNextPeriod.toISOString().split('T')[0];

  // Override with ML state if it indicates period soon
  if (user.mlPredictionState && user.mlPredictionState.prediction) {
    const state = user.mlPredictionState;
    if (state.prediction.includes("soon") || state.prediction.includes("likely")) {
      days = 2; // Threshold for "Soon" banner in Flutter
      accuracy = `Edge ML ${(state.confidence * 100).toFixed(0)}%`;
    }
  }

  const nextDate = predictNextPeriod(user.lastPeriodStart, user.cycleLength);
  const lutealStart = new Date(user.lastPeriodStart);
  lutealStart.setDate(lutealStart.getDate() + (user.cycleLength - 14));

  return {
    nextPeriod: { 
      date: finalDateStr, 
      daysRemaining: days, 
      accuracy: accuracy, 
      signals 
    },
    lutealPhaseStarts: lutealStart.toISOString().split('T')[0],
    periodExpectedDay: user.cycleLength,
    ovulationComplete: true,
    calendarBased: nextDate.toISOString().split('T')[0],
  };
};

const createMedicineAlert = async (userId, medicineName, time) => {
  return createAlert(userId, 'medicine', 'Medicine Reminder', 
    `Time to take your medicine: ${medicineName} (${time})`, 'medium');
};

module.exports = { createAlert, checkPeriodReminder, checkOvulationAlert, checkTemperatureSpike, checkSleepDisturbance, checkHeartRateAlert, checkMLPrediction, evaluateAllAlerts, buildPredictionSummary, createMedicineAlert };
