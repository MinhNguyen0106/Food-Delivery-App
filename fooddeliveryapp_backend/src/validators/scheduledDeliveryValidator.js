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

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid('date must use YYYY-MM-DD format');
  }
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    invalid('date must be a valid calendar date');
  }
}

exports.availableSlots = (req, res, next) => {
  try {
    if (Object.keys(req.query).some((key) => !['address_id', 'date'].includes(key))) {
      invalid('Request contains unsupported query parameters');
    }
    positiveInteger(req.query.address_id, 'address_id');
    date(req.query.date);
    return next();
  } catch (error) {
    return next(error);
  }
};

exports.scheduleOrder = (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      invalid('Request body must be a JSON object');
    }
    const allowed = ['address_id', 'date', 'slot_id', 'note', 'voucher_code'];
    if (Object.keys(req.body).some((key) => !allowed.includes(key))) {
      invalid('Request contains unsupported fields');
    }
    for (const field of ['address_id', 'date', 'slot_id']) {
      if (req.body[field] === undefined) invalid(`Required fields: address_id, date, slot_id`);
    }
    positiveInteger(req.body.address_id, 'address_id');
    positiveInteger(req.body.slot_id, 'slot_id');
    date(req.body.date);
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
