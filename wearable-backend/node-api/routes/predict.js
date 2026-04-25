const express = require("express");
const { buildFeatures } = require("../services/featureBuilder");
const { getPrediction } = require("../services/pythonClient");

const router = express.Router();

router.post("/batch", async (req, res) => {
  try {
    const { user_id, cycle_start, cycle_length, readings } = req.body;

    if (!readings || !Array.isArray(readings)) {
      return res.status(400).json({ error: "readings array is required" });
    }

    // Calculate cycle progress
    let cycle_progress = 14; // default
    if (cycle_start) {
      const start = new Date(cycle_start);
      const today = new Date();
      cycle_progress = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
    }

    const userInput = {
      cycle_progress,
      cycle_length: cycle_length || 28,
      baseline_temp: 36.4 // could be fetched from user config if available
    };

    // Calculate engineered features
    const features = buildFeatures(readings, userInput);

    // Get model prediction based on features
    const modelResult = await getPrediction(features);

    res.json({
      success: true,
      prediction: modelResult.prediction,
      confidence: modelResult.probability || 0.85,
      features_used: features,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Batch prediction error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
