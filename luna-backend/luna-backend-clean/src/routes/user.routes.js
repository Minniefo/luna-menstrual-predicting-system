const router  = require('express').Router();
const ctrl    = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',                 ctrl.getProfile);
router.put('/profile',          ctrl.updateProfile);
router.put('/cycle-settings',   ctrl.updateCycleSettings);
router.put('/sensors',          ctrl.updateSensors);
router.put('/conditions',       ctrl.updateConditions);
router.delete('/account',       ctrl.deleteAccount);

module.exports = router;
