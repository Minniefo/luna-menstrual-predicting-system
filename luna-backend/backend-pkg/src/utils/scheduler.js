/**
 * Scheduled Jobs — MongoDB version
 * Runs daily alert evaluation at 08:00 for all users.
 */
const cron          = require('node-cron');
const User          = require('../models/User');
const Medicine      = require('../models/Medicine');
const SensorReading = require('../models/SensorReading');
const alertsService = require('../services/alerts.service');

const startJobs = () => {
  // 1. Daily Alert Evaluation (08:00)
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running daily alert evaluation…');
    try {
      const users = await User.find({});
      let total = 0;
      for (const user of users) {
        const readings  = await SensorReading.find({ userId: user._id }).sort({ date: 1 }).lean();
        const generated = await alertsService.evaluateAllAlerts(user, readings);
        total += generated.length;
        if (generated.length) {
          console.log(`[Cron] ${generated.length} alert(s) for user ${user.email}`);
        }
      }
      console.log(`[Cron] Done — ${total} total alert(s) generated.`);
    } catch (err) {
      console.error('[Cron] Error during alert evaluation:', err.message);
    }
  });

  // 2. Medicine Reminders (Every minute)
  cron.schedule('* * * * *', async () => {
    const now    = new Date();
    const today  = now.toISOString().split('T')[0];
    const time   = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    try {
      // Find medicines scheduled for this exact minute
      const medicines = await Medicine.find({
        time: time,
        lastAlertDate: { $ne: today }
      });

      if (medicines.length > 0) {
        console.log(`[Cron] Processing ${medicines.length} medicine reminders for ${time}...`);
        for (const med of medicines) {
          await alertsService.createMedicineAlert(med.userId, med.name, med.time);
          med.lastAlertDate = today;
          await med.save();
        }
      }
    } catch (err) {
      console.error('[Cron] Error checking medicine reminders:', err.message);
    }
  });

  console.log('⏰  Daily alert cron job scheduled (08:00 daily)');
  console.log('💊  Medicine reminder checker active (every minute)');
};

module.exports = { startJobs };
