const router  = require('express').Router();
const ctrl    = require('../controllers/ml.controller');
const { protect } = require('../middleware/auth.middleware');

// Public
router.get('/health',                  ctrl.health);

// Protected
router.use(protect);
router.post('/predict',                ctrl.predict);
router.post('/predict/batch',          ctrl.predictBatch);
router.get('/predict/auto',            ctrl.predictAuto);           // from Luna DB
router.get('/predict/from-wearable',   ctrl.predictFromWearable);   // from wearable_iot.readings (ESP32)
router.get('/model/info',              ctrl.modelInfo);

module.exports = router;
