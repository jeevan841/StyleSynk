// server/src/routes/branches.js
const router = require('express').Router();
const ctrl   = require('../controllers/branches');
const { verifyToken }  = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

// Public for internal use — used in dropdowns before login
router.get('/',     ctrl.getAll);
router.get('/:id',  ctrl.getOne);
router.post('/',    verifyToken, requireMinRole('owner'), ctrl.create);
router.patch('/:id',verifyToken, requireMinRole('owner'), ctrl.update);

module.exports = router;
