// server/src/routes/customer.js
const router = require('express').Router();
const ctrl   = require('../controllers/customer');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

// All routes require at minimum the customer role
router.get('/appointments', verifyToken, requireMinRole('customer'), ctrl.getMyAppointments);
router.post('/book',        verifyToken, requireMinRole('customer'), ctrl.book);
router.put('/reschedule',   verifyToken, requireMinRole('customer'), ctrl.reschedule);
router.delete('/cancel',    verifyToken, requireMinRole('customer'), ctrl.cancel);
router.get('/loyalty',      verifyToken, requireMinRole('customer'), ctrl.getLoyalty);

module.exports = router;
