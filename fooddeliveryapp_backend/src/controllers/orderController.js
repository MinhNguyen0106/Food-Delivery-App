const orderService = require('../services/orderService');

exports.list = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.listOrders(req.user, req.query.status),
    });
  } catch (error) {
    return next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.getOrder(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.checkout = async (req, res, next) => {
  try {
    return res.status(201).json({
      success: true,
      data: await orderService.checkout(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.quote = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.quoteCheckout(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.history = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.getOrderHistory(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

function transition(action) {
  return async (req, res, next) => {
    try {
      const data = await orderService.transitionOrder(
        req.params.id, action, req.body.note, req.user
      );
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
}

exports.confirm = transition('confirm');
exports.reject = transition('reject');
exports.prepare = transition('prepare');
exports.ready = transition('ready');
exports.cancel = transition('cancel');
