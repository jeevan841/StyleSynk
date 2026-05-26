// server/src/routes/inventory.js
const router = require('express').Router();
const ctrl   = require('../controllers/inventoryController');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',    verifyToken, requireMinRole('receptionist'),  ctrl.getAll);
router.get('/:id', verifyToken, requireMinRole('receptionist'),  ctrl.getOne);
router.post('/',   verifyToken, requireMinRole('branch_manager'), ctrl.create);
router.patch('/:id', verifyToken, requireMinRole('branch_manager'), ctrl.update);
router.delete('/:id', verifyToken, requireMinRole('owner'),       ctrl.remove);

module.exports = router;
