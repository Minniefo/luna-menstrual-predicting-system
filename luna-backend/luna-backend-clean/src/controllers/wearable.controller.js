/**
 * Wearable Sensor Controller
 * ───────────────────────────
 * POST /api/wearable/readings        – ingest a new sensor reading
 * GET  /api/wearable/readings        – list readings (with date range)
 * GET  /api/wearable/readings/latest – most recent reading
 * GET  /api/wearable/sync-status     – wearable connection status
 */

//const { store, uuid } = require('../utils/mock-store');
const Reading = require('../models/Reading');


// ── Ingest a new reading ──────────────────────────────────────────────────────
exports.addReading = async (req, res) => {
  try {
    const { date, heartRate, temperature, sleepDisturbances } = req.body;

    if (!date) {
      return res.status(400).json({ success: false, message: 'date is required' });
    }

    // 🔥 SAVE TO MONGODB (MATCH YOUR EXISTING STRUCTURE)
    const reading = new Reading({
      device_id: "esp32c3-01",
      reading_time: new Date(),
      received_at: new Date(),
      sensor_data: {
        heart_rate: heartRate,
        temperature: temperature
      },
      derived_metrics: {
        sleep_disturbances: sleepDisturbances
      }
    });

    await reading.save();

    console.log("✅ Saved to MongoDB:", reading);

    return res.status(201).json({
      success: true,
      message: "Reading recorded"
    });

  } catch (err) {
    console.error("❌ Error saving reading:", err);
    res.status(500).json({ success: false });
  }
};

// ── List readings ─────────────────────────────────────────────────────────────
exports.getReadings = (req, res) => {
  const { from, to, limit } = req.query;
  let readings = from && to
    ? store.readingsForDateRange(req.user.id, from, to)
    : store.readingsFor(req.user.id);

  if (limit) readings = readings.slice(-parseInt(limit));
  return res.json({ success: true, data: { readings, total: readings.length } });
};

// ── Latest reading ────────────────────────────────────────────────────────────
exports.getLatestReading = async (req, res) => {
  try {
    const latest = await Reading.findOne()
      .sort({ received_at: -1 }) // 🔥 IMPORTANT
      .lean();

    if (!latest) {
      return res.json({ success: true, data: null });
    }

    return res.json({
      success: true,
      data: {
        heartRate: latest.sensor_data?.heart_rate ?? null,
        temperature: latest.sensor_data?.temperature ?? null,
        sleepDisturbances: latest.derived_metrics?.sleep_disturbances ?? 0,
        timestamp: latest.received_at
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ── Sync status ───────────────────────────────────────────────────────────────
exports.getSyncStatus = (req, res) => {
  const user = store.findUser(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const all = store.readingsFor(user.id);
  const latest = all[all.length - 1];
  return res.json({
    success: true,
    data: {
      connected: true,
      sensors: user.sensors,
      lastSync: latest ? latest.date : null,
      totalReadings: all.length,
      status: 'Synced',
    },
  });
};
