const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeResource = require('../middleware/authorizeResource');
const authorizeRoles = require('../middleware/authorizeRoles');
const controller = require('../controllers/catalogController');
const validation = require('../validators/catalogValidator');
const imageUpload = require('../middleware/imageUpload');

const catalogReaders = ['CUSTOMER', 'RESTAURANT', 'ADMIN'];

router.get('/restaurants', authenticate, authorizeRoles(...catalogReaders), validation.validateRestaurantList, controller.listRestaurants);
router.get('/restaurants/me', authenticate, authorizeRoles('RESTAURANT'), controller.getMyRestaurant);
router.patch(
  '/restaurants/me',
  authenticate,
  authorizeRoles('RESTAURANT'),
  validation.validateMyRestaurantProfile,
  controller.updateMyRestaurant
);
router.get('/restaurants/:id/categories', authenticate, authorizeRoles(...catalogReaders), validation.validateId, controller.listRestaurantCategories);
router.get('/restaurants/:id', authenticate, authorizeRoles(...catalogReaders), validation.validateId, controller.getRestaurant);
router.get('/categories', authenticate, authorizeRoles(...catalogReaders), controller.listCategories);
router.get('/categories/:id', authenticate, authorizeRoles(...catalogReaders), validation.validateId, controller.getCategory);
router.get('/foods', authenticate, authorizeRoles(...catalogReaders), validation.validateFoodList, controller.listFoods);
router.get('/foods/:id', authenticate, authorizeRoles(...catalogReaders), validation.validateId, controller.getFood);

router.put(
  '/restaurants/:id/image',
  authenticate,
  authorizeRoles('RESTAURANT', 'ADMIN'),
  validation.validateId,
  imageUpload,
  controller.uploadRestaurantImage
);
router.delete(
  '/restaurants/:id/image',
  authenticate,
  authorizeRoles('RESTAURANT', 'ADMIN'),
  validation.validateId,
  controller.deleteRestaurantImage
);
router.put(
  '/foods/:id/image',
  authenticate,
  authorizeRoles('RESTAURANT'),
  validation.validateId,
  imageUpload,
  controller.uploadFoodImage
);
router.delete(
  '/foods/:id/image',
  authenticate,
  authorizeRoles('RESTAURANT'),
  validation.validateId,
  controller.deleteFoodImage
);

router.post('/categories', authenticate, authorizeResource('categories'), validation.validateCategoryWrite, controller.createCategory);
router.put('/categories/:id', authenticate, authorizeResource('categories'), validation.validateId, validation.validateCategoryWrite, controller.updateCategory);
router.delete('/categories/:id', authenticate, authorizeResource('categories'), validation.validateId, controller.deleteCategory);

router.post('/foods', authenticate, validation.validateFoodWrite, authorizeResource('foods'), controller.createFood);
router.put('/foods/:id', authenticate, validation.validateId, validation.validateFoodWrite, authorizeResource('foods'), controller.updateFood);
router.delete('/foods/:id', authenticate, authorizeResource('foods'), validation.validateId, controller.deleteFood);

module.exports = router;
