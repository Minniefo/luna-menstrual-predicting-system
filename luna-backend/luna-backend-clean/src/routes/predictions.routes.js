const router  = require('express').Router();
const ctrl    = require('../controllers/predictions.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/next-period',    ctrl.getNextPeriod);
router.get('/ovulation',      ctrl.getOvulationWindow);
router.get('/phase-timeline', ctrl.getPhaseTimeline);
router.get('/confidence',     ctrl.getConfidence);

module.exports = router;
