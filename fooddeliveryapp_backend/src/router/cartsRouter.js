const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/cartController');

router.use(authenticate, authorizeRoles('CUSTOMER'));
router.get('/', controller.get);
router.delete('/', controller.clear);
module.exports = router;
