function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  if (!arr.length) return 0;
  const avg = average(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function buildFeatures(readings, userInput = {}) {
  // Support both raw format and Luna DB format
  const validBpm = readings
    .map(r => Number(r.bpm || r.heartRate))
    .filter(v => !isNaN(v) && v > 0);

  const validTemp = readings
    .map(r => Number(r.temp_c || r.temperature))
    .filter(v => !isNaN(v) && v > 30 && v < 45);

  const validDisturbances = readings
    .map(r => Number(r.acc_mag || r.sleepDisturbances))
    .filter(v => !isNaN(v));

  const hr_mean = average(validBpm);

  const baselineTemp = userInput.baseline_temp ?? 36.0;
  const currentTempMean = average(validTemp);
  const temp_mean = currentTempMean - baselineTemp;

  // Use stdDev of disturbances/accmag or direct average if sleepDisturbances
  const sleep_disturbance_score = validDisturbances.length 
    ? average(validDisturbances) // Using average as disturbances act as a direct score often
    : 0;

  // For demonstration, 3-day averages are mapped to available data
  const hr_mean_3 = hr_mean;
  const temp_mean_3 = temp_mean;
  const sleep_3 = sleep_disturbance_score;

  const cycle_progress = userInput.cycle_progress ?? 14;
  const cycle_length = userInput.cycle_length ?? 28;
  const cycle_progress_norm = cycle_progress / cycle_length;
  const temp_cycle_interaction = temp_mean * cycle_progress_norm;

  return {
    hr_mean,
    temp_mean,
    sleep_disturbance_score,
    hr_mean_3,
    temp_mean_3,
    sleep_3,
    cycle_progress,
    cycle_progress_norm,
    temp_cycle_interaction
  };
}

module.exports = { buildFeatures };