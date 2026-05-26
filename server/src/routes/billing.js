// server/src/routes/billing.js
const router = require('express').Router();
const ctrl   = require('../controllers/billingController');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',              verifyToken, requireMinRole('receptionist'), ctrl.getAll);
router.get('/:id',           verifyToken, requireMinRole('receptionist'), ctrl.getOne);
router.post('/draft',        verifyToken, requireMinRole('receptionist'), ctrl.createDraft);
router.post('/:id/items',    verifyToken, requireMinRole('receptionist'), ctrl.addItem);
router.post('/:id/close',    verifyToken, requireMinRole('receptionist'), ctrl.closeBill);

module.exports = router;
