const voucherService = require('../services/voucherService');

exports.list = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await voucherService.list(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.available = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await voucherService.listAvailable(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await voucherService.get(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    return res.status(201).json({
      success: true,
      data: await voucherService.create(req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await voucherService.update(req.params.id, req.body, req.user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: await voucherService.delete(req.params.id, req.user),
    });
  } catch (error) {
    return next(error);
  }
};
