const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/voucherController');
const validation = require('../validators/voucherValidator');

router.use(authenticate);
router.get('/available', authorizeRoles('CUSTOMER'), controller.available);
router.get('/', authorizeRoles('ADMIN'), controller.list);
router.post('/', authorizeRoles('ADMIN'), validation.create, controller.create);
router.get('/:id', authorizeRoles('ADMIN'), validation.id, controller.get);
router.put('/:id', authorizeRoles('ADMIN'), validation.id, validation.update, controller.update);
router.delete('/:id', authorizeRoles('ADMIN'), validation.id, controller.delete);

module.exports = router;
