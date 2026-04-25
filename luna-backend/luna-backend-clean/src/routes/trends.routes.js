const router  = require('express').Router();
const ctrl    = require('../controllers/trends.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/overview',          ctrl.getOverview);
router.get('/cycle-duration',    ctrl.getCycleDurationTrend);
router.get('/cycle-comparison',  ctrl.getCycleComparison);
router.get('/regularity',        ctrl.getRegularity);
router.get('/sleep',             ctrl.getSleepTrend);
router.get('/temperature',       ctrl.getTemperatureTrend);
router.get('/patterns',          ctrl.getPatterns);

module.exports = router;
