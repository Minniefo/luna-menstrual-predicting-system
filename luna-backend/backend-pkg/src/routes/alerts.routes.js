const router  = require('express').Router();
const ctrl    = require('../controllers/alerts.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',                  ctrl.getAlerts);
router.get('/unread',            ctrl.getUnread);
router.post('/evaluate',         ctrl.evaluate);
router.put('/read-all',          ctrl.markAllRead);
router.get('/prediction',        ctrl.getPredictionSummary);
router.get('/preferences',       ctrl.getPreferences);
router.put('/preferences',       ctrl.updatePreferences);
router.put('/:id/read',          ctrl.markRead);
router.delete('/:id',            ctrl.deleteAlert);

module.exports = router;
