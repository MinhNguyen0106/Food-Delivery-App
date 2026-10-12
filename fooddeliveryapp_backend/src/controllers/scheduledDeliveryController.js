const orderService = require('../services/orderService');

exports.availableSlots = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await orderService.availableScheduledSlots(req.query, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.scheduleOrder = async (req, res, next) => {
  try {
    return res.status(201).json({
      success: true,
      data: await orderService.scheduleOrder(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};
