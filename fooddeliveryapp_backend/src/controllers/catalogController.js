const service = require('../services/catalogService');

function handle(action) {
  return async function controller(req, res, next) {
    try {
      const data = await action(req);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
}

exports.listRestaurants = handle((req) => service.listRestaurants(req.query, req.user));
exports.getRestaurant = handle((req) => service.getRestaurant(req.params.id, req.user));
exports.listRestaurantCategories = handle(
  (req) => service.listRestaurantCategories(req.params.id, req.user)
);
exports.listCategories = handle((req) => service.listCategories(req.user));
exports.getCategory = handle((req) => service.getCategory(req.params.id, req.user));
exports.listFoods = handle((req) => service.listFoods(req.query, req.user));
exports.getFood = handle((req) => service.getFood(req.params.id, req.user));

exports.createCategory = async (req, res, next) => {
  try {
    const id = await service.createCategory(req.body);
    return res.status(201).json({ success: true, message: 'Category created', id });
  } catch (error) {
    return next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    await service.updateCategory(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Category updated' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    await service.deleteCategory(req.params.id);
    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return next(error);
  }
};

exports.createFood = async (req, res, next) => {
  try {
    const id = await service.createFood(req.body, req.user);
    return res.status(201).json({ success: true, message: 'Food created', id });
  } catch (error) {
    return next(error);
  }
};

exports.updateFood = async (req, res, next) => {
  try {
    await service.updateFood(req.params.id, req.body, req.user);
    return res.status(200).json({ success: true, message: 'Food updated' });
  } catch (error) {
    return next(error);
  }
};

exports.deleteFood = async (req, res, next) => {
  try {
    await service.deleteFood(req.params.id, req.user);
    return res.status(200).json({ success: true, message: 'Food deleted' });
  } catch (error) {
    return next(error);
  }
};

exports.uploadRestaurantImage = async (req, res, next) => {
  try {
    const data = await service.uploadRestaurantImage(req.params.id, req.file, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.deleteRestaurantImage = async (req, res, next) => {
  try {
    const data = await service.deleteRestaurantImage(req.params.id, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.uploadFoodImage = async (req, res, next) => {
  try {
    const data = await service.uploadFoodImage(req.params.id, req.file, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

exports.deleteFoodImage = async (req, res, next) => {
  try {
    const data = await service.deleteFoodImage(req.params.id, req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};
