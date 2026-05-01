/*const router  = require('express').Router();
const ctrl    = require('../controllers/wearable.controller');
const { protect } = require('../middleware/auth.middleware');

// Internal sync route for Wearable Python Backend (Unprotected)
router.post('/sync',            ctrl.syncFromWearableBackend);

router.use(protect);

router.post('/readings',        ctrl.addReading);
router.get('/readings',         ctrl.getReadings);
router.get('/readings/latest',  ctrl.getLatestReading);
router.get('/sync-status',      ctrl.getSyncStatus);

module.exports = router;*/

const router  = require('express').Router();
const ctrl    = require('../controllers/wearable.controller');
const { protect } = require('../middleware/auth.middleware');

// ✅ Public internal sync route (for wearable backend)
router.post('/sync',            ctrl.syncFromWearableBackend);
router.post('/ingest',          ctrl.ingestFromESP32);
// 🔒 Protected routes (for app users)
router.use(protect);

router.get('/drilldown',        ctrl.getDailyDrilldown);
router.post('/readings',        ctrl.addReading);
router.get('/readings/latest',  ctrl.getLatestReading);
router.get('/readings',         ctrl.getReadings);
router.get('/sync-status',      ctrl.getSyncStatus);

module.exports = router;
