/**
 * Wearable Sensor Controller — MongoDB
 */
const mongoose      = require('mongoose');
const User          = require('../models/User');
const SensorReading = require('../models/SensorReading');
const { fillDailyGaps } = require('../utils/data.utils');

exports.addReading = async (req, res) => {
  try {
    const { heartRate, temperature, sleepDisturbances } = req.body;

    const reading = new SensorReading({
      userId: req.user.id,
      date: new Date().toISOString().split('T')[0],
      heartRate,
      temperature,
      sleepDisturbances,
    });

    await reading.save();

    console.log("Saved:", reading);

    res.status(201).json({ success: true });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false });
  }
};

exports.syncFromWearableBackend = async (req, res) => {
  try {
    const { user_id, readings, prediction, confidence, features_used, timestamp } = req.body;
    if (!user_id || !Array.isArray(readings)) {
      return res.status(400).json({ success: false, message: 'user_id and readings array required.' });
    }

    const ops = readings.map(r => ({
      updateOne: {
        filter: { userId: user_id, date: r.date },
        update: { $set: { heartRate: r.heartRate, temperature: r.temperature, sleepHours: r.sleepHours, sleepDisturbances: r.sleepDisturbances } },
        upsert: true
      }
    }));
    
    if (ops.length > 0) {
      await SensorReading.bulkWrite(ops);
    }

    if (prediction) {
      await User.findByIdAndUpdate(user_id, {
        "mlPredictionState.prediction": prediction,
        "mlPredictionState.confidence": confidence,
        "mlPredictionState.timestamp": timestamp || new Date()
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Wearable data and predictions synchronized successfully',
      synced_points: ops.length,
      prediction: prediction || null,
      confidence: confidence || null,
      features_used: features_used || null,
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// New Public Ingestion for ESP32 (Auto-mapping for Demo)
exports.ingestFromESP32 = async (req, res) => {
  try {
    // Map ESP32 fields to Backend Schema
    // ESP32 sends: temp_c, bpm, acc_mag, lead_off
    const { temp_c, bpm, acc_mag } = req.body;
    
    const hardcodedUserId = "69e8dd03cdb7e640031b6686"; // Sara's ID

    const reading = new SensorReading({
      userId: hardcodedUserId,
      date: new Date().toISOString().split('T')[0],
      heartRate: bpm || 72,
      temperature: temp_c || 36.6,
      sleepDisturbances: acc_mag > 1.1 ? 1 : 0, // Simplified motion-to-disturbance mapping
      sleepHours: 8 // Placeholder
    });

    await reading.save();
    console.log("ESP32 Ingested:", reading);

    res.status(201).json({ 
      success: true, 
      prediction: "Processing", 
      probability: 0.85 // Mock confirmation for OLED feedback
    });

  } catch (err) {
    console.error("ESP32 Ingest Error:", err);
    res.status(500).json({ success: false });
  }
};


exports.getReadings = async (req, res) => {
  try {
    const { from, to, range, limit } = req.query;
    const filter = { userId: new mongoose.Types.ObjectId(req.user.id) };

    if (range) {
      const dayCount = parseInt(range.replace('d', ''));
      if (!isNaN(dayCount)) {
        const d = new Date();
        d.setDate(d.getDate() - dayCount);
        filter.date = { $gte: d.toISOString().split('T')[0] };
      }
    } else if (from && to) {
      filter.date = { $gte: from, $lte: to };
    }

    const aggregated = await SensorReading.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$date",
          heartRate: { $avg: "$heartRate" },
          temperature: { $avg: "$temperature" },
          sleepHours: { $avg: "$sleepHours" },
          sleepDisturbances: { $avg: "$sleepDisturbances" },
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          date: "$_id",
          heartRate: 1,
          temperature: 1,
          sleepHours: 1,
          sleepDisturbances: 1,
          _id: 0
        }
      }
    ]);

    let dayCount = 14; // default
    if (range) {
      const parsed = parseInt(range.replace('d', ''));
      if (!isNaN(parsed)) dayCount = parsed;
    } else if (limit) {
      dayCount = parseInt(limit);
    }

    const finalReadings = fillDailyGaps(aggregated, dayCount);

    return res.json({ success: true, data: { readings: finalReadings, total: finalReadings.length } });
  } catch (err) {
    console.error("getReadings Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLatestReading = async (req, res) => {
  try {
    const latest = await SensorReading.findOne({ userId: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    if (!latest) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        heartRate: latest.heartRate,
        temperature: latest.temperature,
        sleepHours: latest.sleepHours,
        sleepDisturbances: latest.sleepDisturbances,
      }
    });

  } catch (err) {
    console.error("getLatestReading Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSyncStatus = async (req, res) => {
  try {
    const user    = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const total   = await SensorReading.countDocuments({ userId: user._id });
    const latest  = await SensorReading.findOne({ userId: user._id }).sort({ date: -1 }).lean();
    return res.json({
      success: true,
      data: { connected: true, sensors: user.sensors, lastSync: latest?.date || null, totalReadings: total, status: 'Synced' },
    });
  } catch (err) {
    console.error("getSyncStatus Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
