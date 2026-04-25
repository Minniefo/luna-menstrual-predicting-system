/**
 * Data Utilities for Luna Backend
 */

/**
 * Fills missing dates in a time-series array with default values.
 * Ensures the chart X-axis is linear even if data is missing for some days.
 * 
 * @param {Array} readings - Aggregated readings [{date, ...}]
 * @param {number} days - Number of days to look back
 * @returns {Array} - Filled readings
 */
const fillDailyGaps = (readings, days) => {
  const filled = [];
  const now = new Date();
  
  // Create a map for quick lookup
  const map = new Map(readings.map(r => [r.date, r]));
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    if (map.has(dateStr)) {
      filled.push(map.get(dateStr));
    } else {
      filled.push({
        date: dateStr,
        heartRate: null,
        temperature: null,
        sleepHours: null,
        sleepDisturbances: 0, // Bars should show 0 for no data
        isPlaceholder: true
      });
    }
  }
  return filled;
};

module.exports = {
  fillDailyGaps
};
