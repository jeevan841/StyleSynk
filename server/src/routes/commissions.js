// server/src/routes/commissions.js
const router = require('express').Router();
const ctrl   = require('../controllers/commissions');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',           verifyToken, requireMinRole('stylist'),      ctrl.getAll);
router.post('/calculate', verifyToken, requireMinRole('branch_manager'), ctrl.calculate);

module.exports = router;
