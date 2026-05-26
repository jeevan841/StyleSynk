// server/src/routes/staff.js
const router = require('express').Router();
const ctrl   = require('../controllers/staff');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',    verifyToken, requireMinRole('receptionist'), ctrl.getAll);
router.get('/:id', verifyToken, requireMinRole('receptionist'), ctrl.getOne);
router.get('/:id/commissions', verifyToken, requireMinRole('branch_manager'), ctrl.getCommissions);
router.post('/',   verifyToken, requireMinRole('branch_manager'), ctrl.create);
router.patch('/:id', verifyToken, requireMinRole('branch_manager'), ctrl.update);

module.exports = router;
