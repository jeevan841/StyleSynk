// server/src/routes/analytics.js
const router = require('express').Router();
const ctrl   = require('../controllers/analyticsController');
const { verifyToken }  = require('../middleware/auth');
const { requireMinRole } = require('../middleware/rbac');

router.get('/overview',             verifyToken, requireMinRole('receptionist'), ctrl.overview);
router.get('/revenue-chart',        verifyToken, requireMinRole('receptionist'), ctrl.revenueChart);
router.get('/appointments-chart',   verifyToken, requireMinRole('receptionist'), ctrl.appointmentsChart);
router.get('/branch-performance',   verifyToken, requireMinRole('branch_manager'), ctrl.branchPerformance);
router.get('/services-popularity',  verifyToken, requireMinRole('receptionist'), ctrl.servicesPopularity);

module.exports = router;
