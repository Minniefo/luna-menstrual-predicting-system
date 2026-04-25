const router  = require('express').Router();
const ctrl    = require('../controllers/wearable.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/readings',        ctrl.addReading);
router.get('/readings',         ctrl.getReadings);
router.get('/readings/latest',  ctrl.getLatestReading);
router.get('/sync-status',      ctrl.getSyncStatus);

module.exports = router;
