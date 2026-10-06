const express = require('express');
const authenticate = require('../middleware/authenticate');
const controller = require('../controllers/authController');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.use(authenticate);
router.post('/logout', controller.logout);
router.get('/me', controller.getProfile);
router.patch('/me', controller.updateProfile);
router.post('/change-password', controller.changePassword);

module.exports = router;
