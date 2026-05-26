// server/src/routes/customers.js
const router = require('express').Router();
const ctrl   = require('../controllers/customers');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',    verifyToken, requireMinRole('receptionist'), ctrl.getAll);
router.get('/:id', verifyToken, requireMinRole('receptionist'), ctrl.getOne);
router.post('/',   verifyToken, requireMinRole('receptionist'), ctrl.create);
router.patch('/:id', verifyToken, requireMinRole('receptionist'), ctrl.update);

module.exports = router;
