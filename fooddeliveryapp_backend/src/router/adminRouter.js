const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/adminController');
const validation = require('../validators/adminValidator');

router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/customers', validation.customerList, controller.listCustomers);
router.get('/customers/:id', validation.id, controller.getCustomer);
router.patch('/customers/:id/status', validation.id, validation.customerStatus, controller.setCustomerStatus);

router.get('/restaurants', validation.restaurantList, controller.listRestaurants);
router.post('/restaurants', validation.createRestaurant, controller.createRestaurant);
router.get('/restaurants/:id', validation.id, controller.getRestaurant);
router.patch('/restaurants/:id/status', validation.id, validation.restaurantStatus, controller.setRestaurantStatus);

router.get('/shippers', validation.shipperList, controller.listShippers);
router.post('/shippers', validation.createShipper, controller.createShipper);
router.get('/shippers/:id', validation.id, controller.getShipper);
router.patch('/shippers/:id/account-status', validation.id, validation.shipperStatus, controller.setShipperStatus);

router.get('/orders', validation.orderList, controller.listOrders);
router.get('/orders/:id', validation.id, controller.getOrder);

module.exports = router;
