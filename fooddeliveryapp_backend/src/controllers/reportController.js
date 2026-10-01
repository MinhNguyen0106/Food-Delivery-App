const service = require('../services/reportService');

exports.adminSummary = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await service.adminSummary(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.adminRevenue = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await service.adminRevenue(req.query, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.restaurantRevenue = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await service.restaurantRevenue(req.query, req.user),
    });
  } catch (error) {
    return next(error);
  }
};
