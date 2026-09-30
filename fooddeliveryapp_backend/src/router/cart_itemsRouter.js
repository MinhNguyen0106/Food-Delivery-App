const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/cartController');
const validation = require('../validators/orderingValidator');

router.use(authenticate, authorizeRoles('CUSTOMER'));
router.post('/', validation.addCartItem, controller.addItem);
router.patch('/:id', validation.updateCartItem, controller.updateItem);
router.delete('/:id', validation.cartItemId, controller.deleteItem);
module.exports = router;
