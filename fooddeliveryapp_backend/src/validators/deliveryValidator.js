const AppError = require('../services/AppError');

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function positiveInteger(value, field) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    String(value).trim() === '' ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1 ||
    Number(value) > 2147483647
  ) {
    invalid(`${field} must be a positive 32-bit integer`);
  }
}

exports.deliveryId = (req, res, next) => {
  try {
    positiveInteger(req.params.deliveryId, 'delivery_id');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.orderId = (req, res, next) => {
  try {
    positiveInteger(req.params.orderId, 'order_id');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.availability = (req, res, next) => {
  try {
    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body) ||
      Object.keys(req.body).length !== 1 ||
      !Object.hasOwn(req.body, 'status') ||
      !['ONLINE', 'OFFLINE'].includes(req.body.status)
    ) {
      invalid('status must be ONLINE or OFFLINE');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.emptyBody = (req, res, next) => {
  try {
    if (
      req.body !== undefined &&
      (!req.body || typeof req.body !== 'object' ||
        Array.isArray(req.body) || Object.keys(req.body).length !== 0)
    ) {
      invalid('This action does not accept request fields');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
