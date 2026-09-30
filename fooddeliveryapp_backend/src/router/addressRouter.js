const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/addressController');
const validateAddress = require('../validators/addressValidator');

router.use(authenticate, authorizeRoles('CUSTOMER'));
router.get('/', controller.list);
router.get('/:id', validateAddress.validateId, controller.get);
router.post('/', validateAddress, controller.create);
router.put('/:id', validateAddress, controller.update);
router.delete('/:id', validateAddress.validateId, controller.delete);

module.exports = router;
