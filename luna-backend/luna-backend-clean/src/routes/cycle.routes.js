const router  = require('express').Router();
const ctrl    = require('../controllers/cycle.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/overview',   ctrl.getOverview);
router.get('/phase',      ctrl.getPhase);
router.get('/prediction', ctrl.getPrediction);
router.get('/calendar',   ctrl.getCalendar);
router.get('/history',    ctrl.getCycleHistory);
router.post('/log',       ctrl.logPeriod);
router.get('/ovulation',  ctrl.getOvulationWindow);

module.exports = router;
