const AppError = require('../services/AppError');

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function objectBody(body, allowed, required) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    invalid('Request body must be a JSON object');
  }
  if (Object.keys(body).some((key) => !allowed.includes(key))) {
    invalid('Request contains unsupported fields');
  }
  if (required.some((key) => body[key] === undefined)) {
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

exports.reviewId = (req, res, next) => {
  try {
    positiveInteger(req.params.id, 'review_id');
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.create = (req, res, next) => {
  try {
    objectBody(req.body, ['order_id', 'rating', 'comment'], ['order_id', 'rating']);
    positiveInteger(req.body.order_id, 'order_id');
    if (!Number.isInteger(req.body.rating) || req.body.rating < 1 || req.body.rating > 5) {
      invalid('rating must be an integer from 1 to 5');
    }
    if (
      req.body.comment !== undefined &&
      req.body.comment !== null &&
      (typeof req.body.comment !== 'string' || req.body.comment.length > 1000)
    ) {
      invalid('comment must be a string of at most 1000 characters');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.adminFilter = (req, res, next) => {
  try {
    if (
      req.query.status !== undefined &&
      !['VISIBLE', 'HIDDEN', 'PENDING'].includes(req.query.status)
    ) {
      invalid('status must be VISIBLE, HIDDEN, or PENDING');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.moderate = (req, res, next) => {
  try {
    objectBody(req.body, ['status'], ['status']);
    if (!['VISIBLE', 'HIDDEN'].includes(req.body.status)) {
      invalid('status must be VISIBLE or HIDDEN');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
