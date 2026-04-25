/**
 * Health Insights Service
 * ──────────────────────────
 * Converts raw wearable sensor data into meaningful health insights.
 *
 * Covers all functions listed in the assignment (Health Insights Dashboard):
 *   • Heart rate monitoring and trend analysis
 *   • Body temperature tracking and ovulation detection
 *   • Sleep quality monitoring and scoring
 *   • Overall health status summary
 *   • Natural-language insight generation ("Luna's Health Insight")
 *   • Connection of indicators to menstrual cycle phases
 */

const { getPhaseForDay, getCycleDay } = require('./cycle.service');

// ── Heart Rate ────────────────────────────────────────────────────────────────

/**
 * Classify a heart rate reading.
 * @param {number} bpm
 * @returns {{ status: string, label: string }}
 */
const classifyHeartRate = (bpm) => {
  if (bpm < 55)  return { status: 'low',    label: 'Low'    };
  if (bpm <= 85) return { status: 'normal', label: 'Good'   };
  if (bpm <= 100) return { status: 'elevated', label: 'Elevated' };
  return               { status: 'high',   label: 'High'   };
};

/**
 * Calculate heart rate variability stats from an array of readings.
 */
const analyzeHeartRate = (readings) => {
  if (!readings.length) return null;
  const vals = readings.map(r => r.heartRate).filter(Boolean);
  const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const current = vals[vals.length - 1];
  return { current, average: Math.round(avg), min, max, classification: classifyHeartRate(current) };
};

// ── Body Temperature ──────────────────────────────────────────────────────────

/**
 * Classify a BBT reading.
 */
const classifyTemperature = (temp) => {
  if (temp < 36.1) return { status: 'low',    label: 'Low'    };
  if (temp <= 36.7) return { status: 'normal', label: 'Normal' };
  if (temp <= 37.0) return { status: 'warm',   label: 'Warm'   };
  return               { status: 'elevated', label: 'Elevated' };
};

/**
 * Detect ovulation shift from temperature readings.
 * A sustained rise of ≥0.2 °C above the pre-ovulatory average is the signal.
 */
const detectOvulationShift = (readings) => {
  if (readings.length < 8) return { detected: false, message: 'Insufficient data' };
  const baseline = readings.slice(0, Math.floor(readings.length / 2)).map(r => r.temperature).filter(Boolean);
  const avg = baseline.reduce((s, v) => s + v, 0) / baseline.length;
  const recent = readings.slice(-3).map(r => r.temperature).filter(Boolean);
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const shift = parseFloat((recentAvg - avg).toFixed(2));
  return {
    detected: shift >= 0.2,
    shift,
    message: shift >= 0.2
      ? `Ovulation shift detected (+${shift} °C above baseline)`
      : 'No ovulation shift detected',
  };
};

/**
 * Full temperature analysis.
 */
const analyzeTemperature = (readings) => {
  if (!readings.length) return null;
  const vals = readings.map(r => r.temperature).filter(Boolean);
  const avg  = vals.reduce((s, v) => s + v, 0) / vals.length;
  const current = vals[vals.length - 1];
  return {
    current,
    average: parseFloat(avg.toFixed(1)),
    min: Math.min(...vals),
    max: Math.max(...vals),
    classification: classifyTemperature(current),
    ovulationShift: detectOvulationShift(readings),
  };
};

// ── Sleep Quality ─────────────────────────────────────────────────────────────

/**
 * Classify sleep hours into a quality label.
 */
const classifySleep = (hours, disturbances = 0) => {
  if (hours >= 7 && disturbances <= 1) return { status: 'good',  label: 'Good'  };
  if (hours >= 6 && disturbances <= 3) return { status: 'fair',  label: 'Fair'  };
  return                                      { status: 'poor',  label: 'Poor'  };
};

/**
 * Analyze sleep patterns across readings.
 */
const analyzeSleep = (readings) => {
  if (!readings.length) return null;
  const daily = readings.map(r => ({
    date: r.date,
    hours: r.sleepHours,
    disturbances: r.sleepDisturbances,
    quality: classifySleep(r.sleepHours, r.sleepDisturbances),
  }));
  const avgHours = daily.reduce((s, d) => s + (d.hours || 0), 0) / daily.length;
  const avgDisturbances = daily.reduce((s, d) => s + (d.disturbances || 0), 0) / daily.length;
  const current = daily[daily.length - 1];
  return {
    current,
    averageHours: parseFloat(avgHours.toFixed(1)),
    averageDisturbances: parseFloat(avgDisturbances.toFixed(1)),
    weekly: daily.slice(-7),
    overallQuality: classifySleep(avgHours, avgDisturbances),
  };
};

// ── Overall Health Status ─────────────────────────────────────────────────────

/**
 * Compute an overall health status from the latest readings.
 * Used for the "Overall Health: Good" card on the Health Insights dashboard.
 */
const computeOverallHealth = (hrAnalysis, tempAnalysis, sleepAnalysis) => {
  const scores = [];
  if (hrAnalysis)   scores.push(hrAnalysis.classification.status   === 'normal' ? 2 : 1);
  if (tempAnalysis) scores.push(tempAnalysis.classification.status  === 'normal' ? 2 : 1);
  if (sleepAnalysis) scores.push(sleepAnalysis.current?.quality.status === 'good' ? 2 : 1);

  const avg = scores.reduce((s, v) => s + v, 0) / (scores.length || 1);
  if (avg >= 1.7) return { status: 'Good',   color: '#4CAF50' };
  if (avg >= 1.3) return { status: 'Fair',   color: '#FF9800' };
  return               { status: 'Monitor', color: '#F44336' };
};

// ── Insight generation ────────────────────────────────────────────────────────

/**
 * Generate natural-language health insights ("Luna's Health Insight").
 * Explains physiological changes and connects them to cycle phases.
 *
 * @param {object} hrAnalysis
 * @param {object} tempAnalysis
 * @param {object} sleepAnalysis
 * @param {string} currentPhase  - e.g. 'Ovulation'
 * @returns {string[]} Array of insight messages
 */
const generateHealthInsights = (hrAnalysis, tempAnalysis, sleepAnalysis, currentPhase) => {
  const insights = [];

  // Temperature insight
  if (tempAnalysis?.ovulationShift?.detected) {
    insights.push(
      'Your basal body temperature rose sharply today, which commonly signals an ovulation shift. ' +
      'Consider prioritizing light activity, extra rest, and hydration over the next few days.'
    );
  } else if (tempAnalysis?.classification?.status === 'elevated') {
    insights.push('Elevated body temperature detected. Stay hydrated and monitor for fever symptoms.');
  }

  // Heart rate insight
  if (hrAnalysis?.classification?.status === 'elevated') {
    insights.push(
      `Heart rate is slightly elevated (${hrAnalysis.current} bpm). ` +
      'During the ' + currentPhase + ' phase this can be normal due to hormonal changes.'
    );
  }

  // Sleep insight
  if (sleepAnalysis?.current?.quality.status === 'poor') {
    insights.push(
      `Sleep quality was poor last night (${sleepAnalysis.current.hours}h, ` +
      `${sleepAnalysis.current.disturbances} disturbances). ` +
      'Poor sleep often worsens PMS symptoms – try a consistent bedtime routine.'
    );
  }

  // Phase-specific insight
  const phaseInsights = {
    Menstrual:  'Your body is in the menstrual phase. Iron-rich foods and gentle movement can help manage discomfort.',
    Follicular: 'Estrogen is rising in the follicular phase. Energy and mood typically improve — great time for planning and workouts.',
    Ovulation:  'You are in or near the ovulation window. Fertility is at its peak.',
    Luteal:     'The luteal phase is underway. Progesterone is high. Mood changes and bloating may occur toward the end of this phase.',
  };
  if (phaseInsights[currentPhase]) insights.push(phaseInsights[currentPhase]);

  if (insights.length === 0) {
    insights.push('All health indicators are within normal range. Keep up the great work! 🌙');
  }

  return insights;
};

// ── Full health snapshot ──────────────────────────────────────────────────────

/**
 * Build the complete Health Insights object for the dashboard.
 *
 * @param {object} user
 * @param {Array}  readings   - Last N sensor readings
 * @returns {object}
 */
const buildHealthSnapshot = (user, readings) => {
  const cycleDay  = getCycleDay(user.lastPeriodStart);
  const phaseInfo = getPhaseForDay(cycleDay, user.cycleLength);

  const hrAnalysis    = analyzeHeartRate(readings);
  const tempAnalysis  = analyzeTemperature(readings);
  const sleepAnalysis = analyzeSleep(readings);
  const overallHealth = computeOverallHealth(hrAnalysis, tempAnalysis, sleepAnalysis);
  const insights      = generateHealthInsights(hrAnalysis, tempAnalysis, sleepAnalysis, phaseInfo.phase);

  return {
    overallHealth,
    currentPhase: phaseInfo,
    cycleDay,
    heartRate: hrAnalysis,
    temperature: tempAnalysis,
    sleep: sleepAnalysis,
    insights,
    lastUpdated: new Date(),
  };
};

module.exports = {
  classifyHeartRate,
  analyzeHeartRate,
  classifyTemperature,
  detectOvulationShift,
  analyzeTemperature,
  classifySleep,
  analyzeSleep,
  computeOverallHealth,
  generateHealthInsights,
  buildHealthSnapshot,
};
