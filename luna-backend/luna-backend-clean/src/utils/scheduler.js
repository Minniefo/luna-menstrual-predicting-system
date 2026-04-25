/**
 * Scheduled Jobs
 * ───────────────
 * Runs automated alert evaluation every day at 08:00.
 * This covers the "automated alert generation without user manual input"
 * requirement from the Alerts & Predictions Dashboard design.
 */

const cron = require('node-cron');
const { store }       = require('../utils/mock-store');
const alertsService   = require('../services/alerts.service');

const startJobs = () => {
  // Run at 08:00 every day
  cron.schedule('0 8 * * *', () => {
    console.log('[Cron] Running daily alert evaluation…');
    const users = store.users;
    let total = 0;
    for (const user of users) {
      const readings = store.readingsFor(user.id);
      const generated = alertsService.evaluateAllAlerts(user, readings);
      total += generated.length;
      if (generated.length) {
        console.log(`[Cron] Generated ${generated.length} alert(s) for user ${user.id}`);
      }
    }
    console.log(`[Cron] Daily alert evaluation complete. ${total} total alert(s) generated.`);
  });

  console.log('⏰  Daily alert cron job scheduled (08:00 daily)');
};

module.exports = { startJobs };
