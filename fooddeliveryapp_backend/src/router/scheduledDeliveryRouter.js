const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/scheduledDeliveryController');
const validation = require('../validators/scheduledDeliveryValidator');

router.use(authenticate, authorizeRoles('CUSTOMER'));
router.get('/available-slots', validation.availableSlots, controller.availableSlots);

module.exports = router;
