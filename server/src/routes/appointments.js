// server/src/routes/appointments.js
const router = require('express').Router();
const ctrl   = require('../controllers/appointments');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

// IMPORTANT: /availability must come BEFORE /:id or Express matches "availability" as an id
router.get('/availability', verifyToken, requireMinRole('stylist'), ctrl.getAvailability);

router.get('/',      verifyToken, requireMinRole('stylist'),      ctrl.getAll);
router.get('/:id',   verifyToken, requireMinRole('stylist'),      ctrl.getOne);
router.post('/',     verifyToken, requireMinRole('receptionist'), ctrl.create);
router.put('/:id',   verifyToken, requireMinRole('receptionist'), ctrl.update);
router.delete('/:id',verifyToken, requireMinRole('receptionist'), ctrl.remove);

module.exports = router;
