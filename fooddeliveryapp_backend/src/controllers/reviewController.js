const reviewService = require('../services/reviewService');

exports.create = async (req, res, next) => {
  try {
    return res.status(201).json({
      success: true,
      data: await reviewService.create(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.mine = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await reviewService.listMine(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.adminList = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await reviewService.listAdmin(req.query.status, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.restaurantList = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await reviewService.listRestaurant(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await reviewService.get(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.moderate = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await reviewService.moderate(req.params.id, req.body.status, req.user),
    });
  } catch (error) {
    return next(error);
  }
};
