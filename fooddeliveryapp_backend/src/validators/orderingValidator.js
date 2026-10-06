const AppError = require('../services/AppError');

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function objectBody(body, allowed, required = []) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('Request body must be a JSON object');
  }
  if (Object.keys(body).some((field) => !allowed.includes(field))) {
    invalid('Request contains unsupported fields');
  }
  if (required.some((field) => body[field] === undefined)) {
    invalid(`Required fields: ${required.join(', ')}`);
  }
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

exports.addCartItem = (req, res, next) => {
  try {
    objectBody(req.body, ['food_id', 'quantity'], ['food_id', 'quantity']);
    positiveInteger(req.body.food_id, 'food_id');
    positiveInteger(req.body.quantity, 'quantity');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.updateCartItem = (req, res, next) => {
  try {
    objectBody(req.body, ['quantity'], ['quantity']);
    positiveInteger(req.params.id, 'id');
    positiveInteger(req.body.quantity, 'quantity');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.cartItemId = (req, res, next) => {
  try {
    positiveInteger(req.params.id, 'id');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.checkout = (req, res, next) => {
  try {
    objectBody(req.body, ['address_id', 'note', 'voucher_code'], ['address_id']);
    positiveInteger(req.body.address_id, 'address_id');
    if (
      req.body.note !== undefined &&
      req.body.note !== null &&
      (typeof req.body.note !== 'string' || req.body.note.length > 255)
    ) {
      invalid('note must be a string of at most 255 characters');
    }
    if (
      req.body.voucher_code !== undefined &&
      (
        typeof req.body.voucher_code !== 'string' ||
        req.body.voucher_code.trim().length < 1 ||
        req.body.voucher_code.length > 50
      )
    ) {
      invalid('voucher_code must be a non-empty string of at most 50 characters');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.orderId = (req, res, next) => {
  try {
    positiveInteger(req.params.id, 'id');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.orderList = (req, res, next) => {
  try {
    if (
      req.query.status !== undefined &&
      ![
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'DELIVERING',
        'COMPLETED',
        'CANCELLED',
        'REJECTED',
      ].includes(req.query.status)
    ) {
      invalid('status is not a valid Order status');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.transition = (req, res, next) => {
  try {
    if (req.body === undefined) req.body = {};
    objectBody(req.body, ['note']);
    if (
      req.body.note !== undefined &&
      req.body.note !== null &&
      (typeof req.body.note !== 'string' || req.body.note.length > 255)
    ) {
      invalid('note must be a string of at most 255 characters');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
