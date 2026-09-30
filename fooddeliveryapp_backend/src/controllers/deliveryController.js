const deliveryService = require('../services/deliveryService');

exports.setAvailability = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.setAvailability(req.body.status, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.available = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.listAvailable(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.mine = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.listMine(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.history = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.listHistory(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.getMine(req.params.deliveryId, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.trackOrder = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await deliveryService.trackOrder(req.params.orderId, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

function action(name) {
  return async (req, res, next) => {
    try {
      const data = name === 'accept'
        ? await deliveryService.accept(req.params.deliveryId, req.user)
        : await deliveryService.advance(req.params.deliveryId, name, req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
}

exports.accept = action('accept');
exports.pickup = action('pickup');
exports.start = action('start');
exports.complete = action('complete');
