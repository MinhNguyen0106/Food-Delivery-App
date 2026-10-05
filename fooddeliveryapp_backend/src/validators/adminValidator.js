const AppError = require('../services/AppError');

const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
];

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function validateQuery(req, allowed) {
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) {
    invalid('Query contains unsupported parameters');
  }
  if (
    req.query.q !== undefined &&
    (typeof req.query.q !== 'string' || req.query.q.trim().length > 100)
  ) {
    invalid('q must be a string of at most 100 characters');
  }
}

function validDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(`${field} must use YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    invalid(`${field} must be a valid calendar date`);
  }
}

function validateDateRange(req) {
  for (const key of ['from', 'to']) {
    if (req.query[key] !== undefined) validDate(req.query[key], key);
  }
  if (req.query.from && req.query.to && req.query.from > req.query.to) {
    invalid('from must be on or before to');
  }
}

function run(validator) {
  return (req, res, next) => {
    try {
      validator(req);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

exports.id = run((req) => {
  if (!/^[1-9]\d{0,9}$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
    invalid('id must be a positive 32-bit integer');
  }
});

exports.customerList = run((req) => {
  validateQuery(req, ['q', 'status']);
  if (req.query.status && !['ACTIVE', 'LOCKED'].includes(req.query.status)) {
    invalid('status must be ACTIVE or LOCKED');
  }
});

exports.restaurantList = run((req) => {
  validateQuery(req, ['q', 'status']);
  if (
    req.query.status &&
    !['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'].includes(req.query.status)
  ) {
    invalid('status is not a valid Restaurant status');
  }
});

exports.shipperList = run((req) => {
  validateQuery(req, ['q', 'accountStatus', 'availability']);
  if (
    req.query.accountStatus &&
    !['ACTIVE', 'LOCKED'].includes(req.query.accountStatus)
  ) {
    invalid('accountStatus must be ACTIVE or LOCKED');
  }
  if (
    req.query.availability &&
    !['OFFLINE', 'ONLINE', 'BUSY'].includes(req.query.availability)
  ) {
    invalid('availability must be OFFLINE, ONLINE, or BUSY');
  }
});

exports.orderList = run((req) => {
  validateQuery(req, ['q', 'status', 'from', 'to']);
  if (req.query.status && !orderStatuses.includes(req.query.status)) {
    invalid('status is not a valid Order status');
  }
  validateDateRange(req);
});

function statusBody(req, statuses) {
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length !== 1 ||
    !Object.hasOwn(req.body, 'status') ||
    !statuses.includes(req.body.status)
  ) {
    invalid(`status must be one of: ${statuses.join(', ')}`);
  }
}

exports.customerStatus = run((req) => statusBody(req, ['ACTIVE', 'LOCKED']));
exports.shipperStatus = run((req) => statusBody(req, ['ACTIVE', 'LOCKED']));
exports.restaurantStatus = run((req) =>
  statusBody(req, ['ACTIVE', 'PENDING', 'REJECTED', 'SUSPENDED'])
);

exports.revenueQuery = run((req) => {
  validateQuery(req, ['from', 'to', 'groupBy']);
  validateDateRange(req);
  if (req.query.groupBy && !['day', 'month'].includes(req.query.groupBy)) {
    invalid('groupBy must be day or month');
  }
});

exports.restaurantRevenueQuery = run((req) => {
  validateQuery(req, ['from', 'to', 'groupBy']);
  validateDateRange(req);
  if (req.query.groupBy && !['day', 'week', 'month'].includes(req.query.groupBy)) {
    invalid('groupBy must be day, week, or month');
  }
});
