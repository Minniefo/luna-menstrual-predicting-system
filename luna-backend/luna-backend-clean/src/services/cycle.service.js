/**
 * Cycle Prediction Service
 * ─────────────────────────
 * Provides menstrual cycle phase detection, period prediction,
 * ovulation window calculation, and physiological-based refinements.
 *
 * Covers all functions listed in the assignment document:
 *   • Automatic cycle tracking (Step 1 & 2 – Cycle Tracking Dashboard)
 *   • Accurate period predictions (HMW Q2)
 *   • Phase visualization support (HMW Q3)
 *   • Prediction based on wearable physiological data (Alerts HMW Q2)
 */

/**
 * Determine the current menstrual phase for a given cycle day.
 * Standard 28-day model; adapts to user cycleLength.
 */
const getPhaseForDay = (cycleDay, cycleLength = 28) => {
  const ratio = cycleDay / cycleLength;
  if (ratio <= 0.18)  return { phase: 'Menstrual',   emoji: '🔴', color: '#E91E63', description: 'Menstruation is occurring. Rest and self-care are recommended.' };
  if (ratio <= 0.46)  return { phase: 'Follicular',  emoji: '🌱', color: '#4CAF50', description: 'Follicle-stimulating hormone rises. Energy levels increase.' };
  if (ratio <= 0.54)  return { phase: 'Ovulation',   emoji: '⭐', color: '#FF9800', description: 'Peak fertility window. BBT may spike slightly.' };
  return               { phase: 'Luteal',      emoji: '🌙', color: '#9C27B0', description: 'Progesterone rises. PMS symptoms may appear toward end.' };
};

/**
 * Calculate cycle day from last period start date.
 */
const getCycleDay = (lastPeriodStart) => {
  const start = new Date(lastPeriodStart);
  const today = new Date();
  const diffMs = today - start;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Predict next period date.
 */
const predictNextPeriod = (lastPeriodStart, cycleLength = 28) => {
  const start = new Date(lastPeriodStart);
  const next  = new Date(start);
  next.setDate(start.getDate() + cycleLength);
  return next;
};

/**
 * Calculate ovulation window (typically day 14 of a 28-day cycle).
 */
const calculateOvulationWindow = (lastPeriodStart, cycleLength = 28) => {
  const start = new Date(lastPeriodStart);
  const ovulationDay = cycleLength - 14;
  const ovulationDate = new Date(start);
  ovulationDate.setDate(start.getDate() + ovulationDay);

  const fertileStart = new Date(ovulationDate);
  fertileStart.setDate(ovulationDate.getDate() - 5);

  const fertileEnd = new Date(ovulationDate);
  fertileEnd.setDate(ovulationDate.getDate() + 1);

  return { ovulationDate, fertileStart, fertileEnd };
};

/**
 * Days until next period.
 */
const daysUntilNextPeriod = (nextPeriodDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = nextPeriodDate - today;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * Refine prediction accuracy using wearable physiological data.
 * A temperature spike (>0.2 °C above baseline) indicates ovulation
 * and can be used to recalibrate the predicted next period.
 *
 * @param {Array} readings  - Recent sensor readings [{date, temperature, heartRate, sleepHours}]
 * @param {string} lastPeriodStart
 * @param {number} cycleLength
 * @returns {{ refinedNextPeriod: Date, confidence: number, signals: string[] }}
 */
const refineWithPhysiologicalData = (readings, lastPeriodStart, cycleLength = 28) => {
  const signals = [];
  let adjustment = 0;
  let confidence = 0.85;

  if (!readings || readings.length === 0) {
    return {
      refinedNextPeriod: predictNextPeriod(lastPeriodStart, cycleLength),
      confidence,
      signals: ['No wearable data available – using calendar-based prediction'],
    };
  }

  // Calculate baseline BBT (average of first 7 readings)
  const baselines = readings.slice(0, 7);
  const baselineTemp = baselines.reduce((s, r) => s + (r.temperature || 36.6), 0) / baselines.length;

  // Detect temperature spike (ovulation signal)
  const spikeReading = readings.find(r => (r.temperature || 0) > baselineTemp + 0.2);
  if (spikeReading) {
    signals.push(`BBT spike detected on ${spikeReading.date} (+${(spikeReading.temperature - baselineTemp).toFixed(2)} °C) — ovulation confirmed`);
    confidence = 0.94;
  }

  // Elevated resting heart rate (pre-menstrual signal)
  const avgHR = readings.reduce((s, r) => s + (r.heartRate || 72), 0) / readings.length;
  const recentHR = readings.slice(-3).reduce((s, r) => s + (r.heartRate || 72), 0) / 3;
  if (recentHR > avgHR + 8) {
    signals.push('Elevated resting heart rate detected — pre-menstrual phase likely');
    adjustment -= 1;
    confidence = Math.min(confidence + 0.02, 0.99);
  }

  // Poor sleep quality (PMS signal)
  const recentPoorSleep = readings.slice(-5).filter(r => (r.sleepHours || 7) < 6).length;
  if (recentPoorSleep >= 3) {
    signals.push('Reduced sleep duration over 5 days — possible PMS onset');
    adjustment -= 1;
    confidence = Math.min(confidence + 0.01, 0.99);
  }

  const base = predictNextPeriod(lastPeriodStart, cycleLength);
  const refined = new Date(base);
  refined.setDate(refined.getDate() + adjustment);

  return { refinedNextPeriod: refined, confidence: parseFloat(confidence.toFixed(2)), signals };
};

/**
 * Generate a full cycle overview object for the dashboard.
 */
const buildCycleOverview = (user, readings = []) => {
  const cycleDay  = getCycleDay(user.lastPeriodStart);
  const phaseInfo = getPhaseForDay(cycleDay, user.cycleLength);
  const basePrediction = predictNextPeriod(user.lastPeriodStart, user.cycleLength);
  const { refinedNextPeriod, confidence, signals } = refineWithPhysiologicalData(readings, user.lastPeriodStart, user.cycleLength);
  const ovulation = calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);

  return {
    currentCycleDay: cycleDay,
    cycleLength: user.cycleLength,
    periodLength: user.periodLength,
    phase: phaseInfo,
    prediction: {
      basedOnCalendar: basePrediction.toISOString().split('T')[0],
      refinedByWearable: refinedNextPeriod.toISOString().split('T')[0],
      daysRemaining: daysUntilNextPeriod(refinedNextPeriod),
      confidence: `${Math.round(confidence * 100)}%`,
      signals,
    },
    ovulationWindow: {
      ovulationDate: ovulation.ovulationDate.toISOString().split('T')[0],
      fertileStart:  ovulation.fertileStart.toISOString().split('T')[0],
      fertileEnd:    ovulation.fertileEnd.toISOString().split('T')[0],
    },
  };
};

module.exports = {
  getPhaseForDay,
  getCycleDay,
  predictNextPeriod,
  calculateOvulationWindow,
  daysUntilNextPeriod,
  refineWithPhysiologicalData,
  buildCycleOverview,
};
