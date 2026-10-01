const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/reviewController');
const validation = require('../validators/reviewValidator');

router.use(authenticate);
router.get('/mine', authorizeRoles('CUSTOMER'), controller.mine);
router.get('/restaurant/mine', authorizeRoles('RESTAURANT'), controller.restaurantList);
router.get(
  '/',
  authorizeRoles('ADMIN'),
  validation.adminFilter,
  controller.adminList
);
router.post('/', authorizeRoles('CUSTOMER'), validation.create, controller.create);
router.patch(
  '/:id/status',
  authorizeRoles('ADMIN'),
  validation.reviewId,
  validation.moderate,
  controller.moderate
);
router.get('/:id', validation.reviewId, controller.get);

module.exports = router;
