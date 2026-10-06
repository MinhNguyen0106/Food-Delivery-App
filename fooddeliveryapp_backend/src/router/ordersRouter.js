const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/orderController');
const validation = require('../validators/orderingValidator');

router.use(authenticate, authorizeRoles('CUSTOMER', 'RESTAURANT'));
router.get('/', validation.orderList, controller.list);
router.post('/quote', authorizeRoles('CUSTOMER'), validation.checkout, controller.quote);
router.post('/checkout', authorizeRoles('CUSTOMER'), validation.checkout, controller.checkout);
router.get('/:id/history', validation.orderId, controller.history);
router.post('/:id/confirm', validation.orderId, validation.transition, controller.confirm);
router.post('/:id/reject', validation.orderId, validation.transition, controller.reject);
router.post('/:id/prepare', validation.orderId, validation.transition, controller.prepare);
router.post('/:id/ready-for-pickup', validation.orderId, validation.transition, controller.ready);
router.post('/:id/cancel', authorizeRoles('CUSTOMER'), validation.orderId, validation.transition, controller.cancel);
router.get('/:id', validation.orderId, controller.get);
module.exports = router;
