// server/src/routes/services.js
const router = require('express').Router();
const ctrl   = require('../controllers/services');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

// Public GET for booking forms
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/',   verifyToken, requireMinRole('branch_manager'), ctrl.create);
router.patch('/:id', verifyToken, requireMinRole('branch_manager'), ctrl.update);

module.exports = router;
