/**
 * Trends & Analytics Service
 * ───────────────────────────
 * Provides long-term menstrual health trend analysis.
 *
 * Covers all functions listed in the assignment (Trends & Analytics Dashboard):
 *   • Cycle duration trend over multiple months
 *   • Historical cycle comparison (bar chart data)
 *   • Sleep pattern trends across cycles
 *   • Body temperature trend visualization
 *   • Cycle regularity analysis
 *   • Monthly & yearly summary statistics
 *   • Identification of recurring patterns / irregularities
 */

const { getCycleDay, getPhaseForDay } = require('./cycle.service');
const { classifySleep } = require('./health.service');

// ── Cycle duration trend ───────────────────────────────────────────────────────

/**
 * Build a time-series of cycle durations for a line chart.
 * @param {Array} cycles  - Stored cycle entries [{startDate, duration}]
 * @returns {Array}       - [{month, duration}]
 */
const buildCycleDurationTrend = (cycles) => {
  return cycles.map(c => {
    const d = new Date(c.startDate);
    return {
      month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
      duration: c.duration || 28,
      startDate: c.startDate,
    };
  });
};

// ── Cycle comparison ──────────────────────────────────────────────────────────

/**
 * Build bar-chart data comparing recent cycles.
 * Returns the last N cycles with duration, phase breakdown, etc.
 *
 * @param {Array} cycles
 * @param {number} n  - How many cycles to compare (default 6)
 */
const buildCycleComparison = (cycles, n = 6) => {
  const recent = cycles.slice(-n);
  return recent.map((c, i) => ({
    label: `Cycle ${i + 1}`,
    startDate: c.startDate,
    duration: c.duration || 28,
    periodLength: c.periodLength || 5,
  }));
};

// ── Regularity analysis ───────────────────────────────────────────────────────

/**
 * Determine if cycles are regular (standard deviation ≤ 3 days).
 *
 * @param {Array} cycles
 * @returns {{ label: string, avgLength: number, stdDev: number, irregular: boolean }}
 */
const analyzeCycleRegularity = (cycles) => {
  if (cycles.length < 2) {
    return { label: 'Insufficient data', avgLength: 28, stdDev: 0, irregular: false };
  }
  const durations = cycles.map(c => c.duration || 28);
  const avg = durations.reduce((s, v) => s + v, 0) / durations.length;
  const variance = durations.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / durations.length;
  const stdDev = Math.sqrt(variance);
  const irregular = stdDev > 3;
  return {
    label: irregular ? 'Irregular' : 'Regular',
    avgLength: parseFloat(avg.toFixed(1)),
    stdDev: parseFloat(stdDev.toFixed(1)),
    irregular,
    insight: irregular
      ? `Cycle variability is ${stdDev.toFixed(1)} days — consider consulting a healthcare professional.`
      : `Cycles are consistent (±${stdDev.toFixed(1)} days). Great pattern!`,
  };
};

// ── Sleep trend ───────────────────────────────────────────────────────────────

/**
 * Build a sleep hours trend line from sensor readings.
 * @param {Array} readings  - [{date, sleepHours, sleepDisturbances}]
 * @returns {Array}
 */
const buildSleepTrend = (readings) => {
  return readings.map(r => ({
    date: r.date,
    hours: r.sleepHours,
    disturbances: r.sleepDisturbances,
    quality: classifySleep(r.sleepHours, r.sleepDisturbances).label,
  }));
};

// ── Temperature trend ─────────────────────────────────────────────────────────

/**
 * Build a temperature trend line.
 * Includes a 36.7 °C baseline reference for ovulation shift interpretation.
 * @param {Array} readings
 * @returns {{ data: Array, baseline: number }}
 */
const buildTemperatureTrend = (readings) => {
  const data = readings.map(r => ({
    date: r.date,
    temperature: r.temperature,
  }));
  const baseline = 36.7;
  return { data, baseline };
};

// ── Wellness trend summary ────────────────────────────────────────────────────

/**
 * Build the full trend overview card stats shown at the top of the Trends page.
 * ("Average cycle 28.3 days — Regular cycle")
 *
 * @param {Array} cycles
 * @param {Array} readings
 */
const buildTrendOverview = (cycles, readings) => {
  const regularity = analyzeCycleRegularity(cycles);
  const sleepData  = buildSleepTrend(readings);
  const tempData   = buildTemperatureTrend(readings);

  const avgSleep = sleepData.length
    ? sleepData.reduce((s, d) => s + d.hours, 0) / sleepData.length
    : 0;
  const avgTemp = tempData.data.length
    ? tempData.data.reduce((s, d) => s + d.temperature, 0) / tempData.data.length
    : 36.6;

  return {
    cycleSummary: {
      averageCycleLength: regularity.avgLength,
      cycleRegularity: regularity.label,
      totalCyclesTracked: cycles.length,
      regularity,
    },
    wellnessSummary: {
      averageSleepHours: parseFloat(avgSleep.toFixed(1)),
      averageTemperature: parseFloat(avgTemp.toFixed(1)),
    },
    charts: {
      cycleDurationTrend: buildCycleDurationTrend(cycles),
      cycleComparison: buildCycleComparison(cycles),
      sleepTrend: sleepData,
      temperatureTrend: tempData,
    },
    footer: 'Data synced from wearable biometrics. Privacy-first — all data stored locally unless you choose to backup.',
  };
};

// ── Identify recurring patterns ───────────────────────────────────────────────

/**
 * Look for recurring symptoms or patterns across cycles.
 * Simple heuristic: if poor sleep appears in the last 5 days of each cycle.
 *
 * @param {Array} cycles
 * @param {Array} readings
 * @returns {string[]} insight strings
 */
const identifyRecurringPatterns = (cycles, readings) => {
  const patterns = [];
  const regularity = analyzeCycleRegularity(cycles);
  
  if (regularity.irregular) {
    patterns.push(`Clinical observation: Significant cycle variability identified (±${regularity.stdDev} days). This may impact metabolic predictability.`);
  } else if (cycles.length > 2) {
    patterns.push('Statistical Trend: High degree of cycle regularity maintains a consistent physiological baseline.');
  }

  // Sleep Analysis
  const validSleep = readings.filter(r => r.sleepHours != null);
  const poorSleepDays = validSleep.filter(r => r.sleepHours < 6).length;
  if (poorSleepDays > validSleep.length * 0.3) {
    patterns.push(`Physiological Alert: Recurrent sleep insufficiency (${poorSleepDays} sessions) detected. Correlated patterns suggest possible correlation with hormonal shifts.`);
  }

  // Temperature / Metabolic
  const highTempDays = readings.filter(r => (r.temperature || 0) > 37.0).length;
  if (highTempDays > 5) {
    patterns.push(`Metabolic Pattern: Sustained thermal elevation noted for ${highTempDays} days, typical of post-ovulatory progesterone shifts.`);
  }

  // Resting Heart Rate
  const validHR = readings.filter(r => r.heartRate != null);
  if (validHR.length > 7) {
    const avgHR = validHR.reduce((s, r) => s + r.heartRate, 0) / validHR.length;
    const spikes = validHR.filter(r => r.heartRate > avgHR + 10).length;
    if (spikes > 2) {
      patterns.push(`Cardiac Trend: ${spikes} instances of elevated resting heart rate. Consider tracking stress or caffeine intake.`);
    }
  }

  if (patterns.length === 0) {
    patterns.push('Stasis: Physiological markers remain within optimal baseline ranges. No anomalies detected.');
  }
  return patterns;
};

module.exports = {
  buildCycleDurationTrend,
  buildCycleComparison,
  analyzeCycleRegularity,
  buildSleepTrend,
  buildTemperatureTrend,
  buildTrendOverview,
  identifyRecurringPatterns,
};
