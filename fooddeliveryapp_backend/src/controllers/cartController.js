const orderService = require('../services/orderService');

exports.get = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.getCart(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.addItem = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.addCartItem(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.updateCartItem(req.params.id, req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.deleteCartItem(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.clear = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.clearCart(req.user),
    });
  } catch (error) {
    return next(error);
  }
};
