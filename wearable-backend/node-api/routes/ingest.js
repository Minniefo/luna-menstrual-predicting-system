const express = require("express");
const fs = require("fs");
const path = require("path");
const { buildFeatures } = require("../services/featureBuilder");
const { getPrediction } = require("../services/pythonClient");

const router = express.Router();

const dataFile = path.join(__dirname, "..", "data", "readings.json");

function loadReadings() {
  const raw = fs.readFileSync(dataFile, "utf-8");
  return JSON.parse(raw);
}

function saveReadings(readings) {
  fs.writeFileSync(dataFile, JSON.stringify(readings, null, 2));
}

router.post("/ingest", async (req, res) => {
  try {
    const readings = loadReadings();

    const newReading = {
      timestamp: new Date().toISOString(),
      temp_c: req.body.temp_c,
      bpm: req.body.bpm,
      acc_mag: req.body.acc_mag,
      lead_off: req.body.lead_off ?? false
    };

    readings.push(newReading);
    saveReadings(readings);

    const userInput = {
      baseline_temp: 36.0,
      cycle_progress: 22
    };

    const features = buildFeatures(readings, userInput);
    const modelResult = await getPrediction(features);

    res.json({
      message: "Reading stored successfully",
      prediction: modelResult.prediction,
      probability: modelResult.probability
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/latest", (req, res) => {
  try {
    const readings = loadReadings();
    const latest = readings.slice(-10);
    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;