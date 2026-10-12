const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/scheduledDeliveryController');
const validation = require('../validators/scheduledDeliveryValidator');

router.post(
  '/schedule',
  authenticate,
  authorizeRoles('CUSTOMER'),
  validation.scheduleOrder,
  controller.scheduleOrder
);

module.exports = router;
