/**
 * Alerts & Predictions Service
 * ─────────────────────────────
 * Generates alerts and notifications based on physiological signals
 * and menstrual cycle predictions.
 *
 * Covers all functions from the assignment (Alerts & Predictions Dashboard):
 *   • Automated alert generation without user manual input
 *   • Advance notifications before cycle events
 *   • Clear, typed alerts with priority levels
 *   • Alert fatigue prevention (deduplication + daily limit)
 *   • Notification preferences per user
 *   • Health-signal-based alerts (BBT spike, sleep, HR)
 */

const { store, uuid } = require('../utils/mock-store');
const { daysUntilNextPeriod, predictNextPeriod, refineWithPhysiologicalData } = require('./cycle.service');
const { classifyHeartRate, detectOvulationShift, classifySleep } = require('./health.service');

// ── Alert factory ────────────────────────────────────────────────────────────

const createAlert = (userId, type, title, message, priority = 'medium') => {
  const alert = {
    id: uuid(),
    userId,
    type,
    title,
    message,
    priority,          // 'high' | 'medium' | 'low'
    isRead: false,
    createdAt: new Date(),
  };
  store.addAlert(alert);
  return alert;
};

// ── Core alert generators ─────────────────────────────────────────────────────

/**
 * Check if a period reminder should fire (1 day, 3 days, 7 days before).
 */
const checkPeriodReminder = (user, readings) => {
  const prefs = store.getPrefs(user.id);
  if (!prefs.periodReminder) return null;

  const { refinedNextPeriod } = refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const days = daysUntilNextPeriod(refinedNextPeriod);

  if ([1, 3, 7].includes(days)) {
    return createAlert(
      user.id,
      'period_reminder',
      `Period in ${days} Day${days > 1 ? 's' : ''}`,
      `Your next period is predicted in ${days} day${days > 1 ? 's' : ''} — ${refinedNextPeriod.toDateString()}. Be prepared!`,
      days === 1 ? 'high' : 'medium'
    );
  }
  return null;
};

/**
 * Detect ovulation and fire an alert.
 */
const checkOvulationAlert = (user, readings) => {
  const prefs = store.getPrefs(user.id);
  if (!prefs.ovulationAlert || readings.length < 5) return null;

  const shift = detectOvulationShift(readings);
  if (shift.detected) {
    return createAlert(
      user.id,
      'ovulation_detected',
      'Ovulation Detected',
      `BBT rose ${shift.shift} °C above baseline — peak fertility window. ${shift.message}`,
      'high'
    );
  }
  return null;
};

/**
 * Detect a temperature spike above safe baseline.
 */
const checkTemperatureSpike = (user, readings) => {
  const prefs = store.getPrefs(user.id);
  if (!prefs.temperatureSpike || !readings.length) return null;

  const latest = readings[readings.length - 1];
  if (!latest?.temperature) return null;

  if (latest.temperature >= 37.5) {
    return createAlert(
      user.id,
      'temperature_spike',
      'Temperature Spike',
      `Body temperature recorded at ${latest.temperature} °C today — above normal. Monitor for fever.`,
      'high'
    );
  }
  return null;
};

/**
 * Detect poor sleep and fire an alert.
 */
const checkSleepDisturbance = (user, readings) => {
  const prefs = store.getPrefs(user.id);
  if (!prefs.sleepDisturbance || !readings.length) return null;

  const latest = readings[readings.length - 1];
  if (!latest) return null;

  const quality = classifySleep(latest.sleepHours, latest.sleepDisturbances);
  if (quality.status === 'poor') {
    return createAlert(
      user.id,
      'sleep_disturbance',
      'Poor Sleep Detected',
      `${latest.sleepDisturbances} disturbances detected last night (${latest.sleepHours}h sleep). Consider adjusting your bedtime routine.`,
      'medium'
    );
  }
  return null;
};

/**
 * Elevated resting heart rate alert.
 */
const checkHeartRateAlert = (user, readings) => {
  if (!readings.length) return null;
  const latest = readings[readings.length - 1];
  const hr = classifyHeartRate(latest?.heartRate || 72);
  if (hr.status === 'high') {
    return createAlert(
      user.id,
      'heart_rate_alert',
      'Elevated Heart Rate',
      `Resting heart rate of ${latest.heartRate} bpm detected — above the normal range. Rest and monitor.`,
      'high'
    );
  }
  return null;
};

// ── Batch alert evaluation ────────────────────────────────────────────────────

/**
 * Run all alert checks for a user and return newly generated alerts.
 * Called by the daily cron job.
 *
 * @param {object} user
 * @param {Array}  readings  - Recent sensor readings
 * @returns {Array}          - Array of new alert objects
 */
const evaluateAllAlerts = (user, readings) => {
  const generated = [];
  const checks = [
    checkPeriodReminder,
    checkOvulationAlert,
    checkTemperatureSpike,
    checkSleepDisturbance,
    checkHeartRateAlert,
  ];

  for (const check of checks) {
    try {
      const alert = check(user, readings);
      if (alert) generated.push(alert);
    } catch (e) {
      console.error(`Alert check failed: ${check.name}`, e.message);
    }
  }
  return generated;
};

// ── Prediction summary builder ────────────────────────────────────────────────

/**
 * Build the prediction summary shown in the Alerts & Predictions dashboard
 * (Luteal phase start, expected period date, ovulation complete flag, etc.)
 */
const buildPredictionSummary = (user, readings) => {
  const { refinedNextPeriod, confidence, signals } = refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const days = daysUntilNextPeriod(refinedNextPeriod);
  const nextDate = predictNextPeriod(user.lastPeriodStart, user.cycleLength);

  // Luteal phase starts at cycle day (cycleLength - 14)
  const lutealStartDay = user.cycleLength - 14;
  const lutealStart = new Date(user.lastPeriodStart);
  lutealStart.setDate(lutealStart.getDate() + lutealStartDay);

  return {
    nextPeriod: {
      date: refinedNextPeriod.toISOString().split('T')[0],
      daysRemaining: days,
      accuracy: `${Math.round(confidence * 100)}%`,
      signals,
    },
    lutealPhaseStarts: lutealStart.toISOString().split('T')[0],
    periodExpectedDay: user.cycleLength,
    ovulationComplete: true,
    calendarBased: nextDate.toISOString().split('T')[0],
  };
};

module.exports = {
  createAlert,
  checkPeriodReminder,
  checkOvulationAlert,
  checkTemperatureSpike,
  checkSleepDisturbance,
  checkHeartRateAlert,
  evaluateAllAlerts,
  buildPredictionSummary,
};
