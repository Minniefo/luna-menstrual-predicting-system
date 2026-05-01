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

// Removed refineWithPhysiologicalData to strictly enforce ML inference via wearable-backend

/**
 * Generate a full cycle overview object for the dashboard.
 */
const buildCycleOverview = (user, readings = [], mlPrediction = null) => {
  const cycleDay  = getCycleDay(user.lastPeriodStart);
  const phaseInfo = getPhaseForDay(cycleDay, user.cycleLength);
  const basePrediction = predictNextPeriod(user.lastPeriodStart, user.cycleLength);
  const ovulation = calculateOvulationWindow(user.lastPeriodStart, user.cycleLength);
  
  let displayState = "No immediate indication";
  if (mlPrediction && mlPrediction.prediction === "soon") displayState = "Period likely soon";
  if (mlPrediction && mlPrediction.prediction === "late") displayState = "Cycle delayed";
  
  const predictionResult = mlPrediction
    ? {
        basedOnCalendar: basePrediction.toISOString().split('T')[0],
        refinedByWearable: displayState,
        rawPrediction: mlPrediction.prediction,
        daysRemaining: daysUntilNextPeriod(basePrediction), // Base calendar until we have exact date ML
        confidence: mlPrediction.confidence 
          ? `${Math.min(99, Math.round(mlPrediction.confidence * 100))}%` 
          : 'Unknown',
        signals: mlPrediction.features_used ? Object.entries(mlPrediction.features_used).map(([k,v]) => `${k}: ${Number(v).toFixed(2)}`) : ['Processed by Wearable Backend natively'],
        timestamp: mlPrediction.timestamp
      }
    : {
        basedOnCalendar: basePrediction.toISOString().split('T')[0],
        daysRemaining: daysUntilNextPeriod(basePrediction),
        confidence: "Fallback Mode",
        signals: ["Wearable API unavailable. Tracking with basic calendar."],
      };

  return {
    currentCycleDay: cycleDay,
    cycleLength: user.cycleLength,
    periodLength: user.periodLength,
    phase: phaseInfo,
    prediction: predictionResult,
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
  buildCycleOverview,
};
