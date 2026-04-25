const router  = require('express').Router();
const ctrl    = require('../controllers/medicines.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',              ctrl.getMedicines);
router.post('/',             ctrl.addMedicine);
router.get('/schedule',      ctrl.getSchedule);
router.put('/:id',           ctrl.updateMedicine);
router.delete('/:id',        ctrl.deleteMedicine);
router.post('/:id/take',     ctrl.takeDose);

module.exports = router;
