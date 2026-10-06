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

function createAccountBody(req, fields) {
  const body = req.body;
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((field) => !fields.includes(field))
  ) {
    invalid('Request body contains unsupported fields');
  }
  return body;
}

function requiredText(value, field, maxLength) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > maxLength
  ) {
    invalid(`${field} is required and must be at most ${maxLength} characters`);
  }
}

function validateCredentials(body) {
  requiredText(body.email, 'email', 150);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    invalid('email is invalid');
  }
  if (
    typeof body.password !== 'string' ||
    body.password.length < 8 ||
    Buffer.byteLength(body.password, 'utf8') > 72
  ) {
    invalid('password must be between 8 and 72 bytes and at least 8 characters');
  }
  requiredText(body.phone, 'phone', 20);
  if (!/^\+?[0-9]{8,15}$/.test(body.phone.trim())) {
    invalid('phone is invalid');
  }
}

exports.createShipper = run((req) => {
  const body = createAccountBody(req, ['email', 'password', 'fullName', 'phone']);
  validateCredentials(body);
  requiredText(body.fullName, 'fullName', 100);
});

exports.createRestaurant = run((req) => {
  const body = createAccountBody(req, [
    'email',
    'password',
    'name',
    'address',
    'phone',
    'description',
    'latitude',
    'longitude',
    'openingTime',
    'closingTime',
  ]);
  validateCredentials(body);
  requiredText(body.name, 'name', 150);
  requiredText(body.address, 'address', 255);
  for (const field of ['latitude', 'longitude']) {
    if (typeof body[field] !== 'number' || !Number.isFinite(body[field])) {
      invalid(`${field} must be a valid number`);
    }
  }
  if (body.latitude < -90 || body.latitude > 90) {
    invalid('latitude must be between -90 and 90');
  }
  if (body.longitude < -180 || body.longitude > 180) {
    invalid('longitude must be between -180 and 180');
  }
  if (
    body.description !== undefined &&
    body.description !== null &&
    (typeof body.description !== 'string' || body.description.length > 5000)
  ) {
    invalid('description must be at most 5000 characters');
  }
  for (const field of ['openingTime', 'closingTime']) {
    if (
      body[field] !== undefined &&
      body[field] !== null &&
      body[field] !== '' &&
      (typeof body[field] !== 'string' ||
        !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(body[field]))
    ) {
      invalid(`${field} must use HH:mm or HH:mm:ss`);
    }
  }
});

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
