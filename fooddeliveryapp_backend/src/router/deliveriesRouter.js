const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/deliveryController');
const validation = require('../validators/deliveryValidator');

router.use(authenticate);
router.patch(
  '/me/status',
  authorizeRoles('SHIPPER'),
  validation.availability,
  controller.setAvailability
);
router.get('/available', authorizeRoles('SHIPPER'), controller.available);
router.get('/mine', authorizeRoles('SHIPPER'), controller.mine);
router.get('/history', authorizeRoles('SHIPPER'), controller.history);
router.get(
  '/orders/:orderId',
  authorizeRoles('CUSTOMER', 'RESTAURANT', 'SHIPPER'),
  validation.orderId,
  controller.trackOrder
);
router.post(
  '/:deliveryId/accept',
  authorizeRoles('SHIPPER'),
  validation.deliveryId,
  validation.emptyBody,
  controller.accept
);
router.post(
  '/:deliveryId/pickup',
  authorizeRoles('SHIPPER'),
  validation.deliveryId,
  validation.emptyBody,
  controller.pickup
);
router.post(
  '/:deliveryId/start',
  authorizeRoles('SHIPPER'),
  validation.deliveryId,
  validation.emptyBody,
  controller.start
);
router.post(
  '/:deliveryId/complete',
  authorizeRoles('SHIPPER'),
  validation.deliveryId,
  validation.emptyBody,
  controller.complete
);
router.get(
  '/:deliveryId',
  authorizeRoles('SHIPPER'),
  validation.deliveryId,
  controller.getMine
);

module.exports = router;
