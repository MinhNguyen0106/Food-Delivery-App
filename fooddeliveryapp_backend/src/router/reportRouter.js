const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/reportController');
const validation = require('../validators/reportValidator');

router.use(authenticate);
router.get('/admin/summary', authorizeRoles('ADMIN'), controller.adminSummary);
router.get('/admin/revenue', authorizeRoles('ADMIN'), validation.revenueQuery, controller.adminRevenue);
router.get(
  '/restaurant/revenue',
  authorizeRoles('RESTAURANT'),
  validation.restaurantRevenueQuery,
  controller.restaurantRevenue
);

module.exports = router;
