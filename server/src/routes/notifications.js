// server/src/routes/notifications.js
const router = require('express').Router();
const ctrl   = require('../controllers/notificationsController');
const { verifyToken }    = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/',           verifyToken, requireMinRole('stylist'),      ctrl.getAll);
router.patch('/:id/read', verifyToken, requireMinRole('stylist'),      ctrl.markRead);
router.post('/mark-all-read', verifyToken, requireMinRole('receptionist'), ctrl.markAllRead);

module.exports = router;
