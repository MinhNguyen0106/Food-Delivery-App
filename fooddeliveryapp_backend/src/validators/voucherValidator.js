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

function money(value, field, allowZero) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^(0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(String(value)) ||
    (!allowZero && Number(value) <= 0)
  ) {
    invalid(`${field} must be a ${allowZero ? 'non-negative' : 'positive'} amount with at most two decimals`);
  }
}

function dateTime(value, field) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value) ||
    !Number.isFinite(new Date(`${value.replace(' ', 'T')}Z`).getTime())
  ) {
    invalid(`${field} must use YYYY-MM-DD HH:mm:ss format`);
  }
  const [year, month, day, hour, minute, second] =
    value.match(/\d+/g).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    year < 1000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    invalid(`${field} must be a valid calendar date and time`);
  }
}

function voucherBody(req) {
  objectBody(
    req.body,
    ['code', 'discount_value', 'min_order_value', 'usage_limit', 'status', 'start_date', 'end_date'],
    ['code', 'discount_value', 'min_order_value', 'usage_limit', 'status', 'start_date', 'end_date']
  );
  if (
    typeof req.body.code !== 'string' ||
    !/^[A-Za-z0-9_-]{1,50}$/.test(req.body.code.trim())
  ) {
    invalid('code must contain 1 to 50 letters, numbers, underscores, or hyphens');
  }
  money(req.body.discount_value, 'discount_value', false);
  money(req.body.min_order_value, 'min_order_value', true);
  if (
    !Number.isSafeInteger(Number(req.body.usage_limit)) ||
    Number(req.body.usage_limit) < 1 ||
    Number(req.body.usage_limit) > 2147483647
  ) {
    invalid('usage_limit must be a positive 32-bit integer');
  }
  if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(req.body.status)) {
    invalid('status must be ACTIVE, INACTIVE, or EXPIRED');
  }
  dateTime(req.body.start_date, 'start_date');
  dateTime(req.body.end_date, 'end_date');
  const start = req.body.start_date.replace('T', ' ');
  const end = req.body.end_date.replace('T', ' ');
  if (end <= start) invalid('end_date must be later than start_date');
}

exports.id = (req, res, next) => {
  try {
    if (!/^[1-9]\d{0,9}$/.test(req.params.id) || Number(req.params.id) > 2147483647) {
      invalid('id must be a positive 32-bit integer');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.create = (req, res, next) => {
  try {
    voucherBody(req);
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.update = exports.create;
