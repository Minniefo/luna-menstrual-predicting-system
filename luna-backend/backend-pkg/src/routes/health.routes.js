const router  = require('express').Router();
const ctrl    = require('../controllers/health.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/snapshot',    ctrl.getSnapshot);
router.get('/heart-rate',  ctrl.getHeartRate);
router.get('/temperature', ctrl.getTemperature);
router.get('/sleep',       ctrl.getSleep);
router.get('/insights',    ctrl.getInsights);
router.get('/status',      ctrl.getStatus);

module.exports = router;
