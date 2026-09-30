const AppError = require('../services/AppError');

const fields = new Set([
  'address_name',
  'receiver_name',
  'receiver_phone',
  'full_address',
  'latitude',
  'longitude',
  'note',
  'is_default',
]);

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

module.exports = function validateAddress(req, res, next) {
  const data = req.body;
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      invalid('Request body must be an object');
    }
    const keys = Object.keys(data);
    if (keys.length === 0 || keys.some((key) => !fields.has(key))) {
      invalid('Request must contain supported address fields');
    }
    const required = ['address_name', 'receiver_name', 'receiver_phone', 'full_address', 'latitude', 'longitude'];
    if (req.method === 'POST' && required.some((key) => data[key] === undefined)) {
      invalid('Address name, receiver, phone, full address and coordinates are required');
    }
    const textLimits = {
      address_name: 100,
      receiver_name: 100,
      receiver_phone: 20,
      full_address: 255,
      note: 255,
    };
    for (const [field, limit] of Object.entries(textLimits)) {
      if (data[field] !== undefined && data[field] !== null &&
        (typeof data[field] !== 'string' || data[field].trim().length === 0 || data[field].length > limit)) {
        invalid(`${field} must be a non-empty string of at most ${limit} characters`);
      }
    }
    if (data.receiver_phone !== undefined && !/^\+?[0-9]{8,15}$/.test(data.receiver_phone)) {
      invalid('receiver_phone must contain 8 to 15 digits, optionally prefixed by +');
    }
    for (const [field, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
      if (data[field] !== undefined) {
        if (
          (typeof data[field] !== 'number' && typeof data[field] !== 'string') ||
          String(data[field]).trim() === ''
        ) {
          invalid(`${field} must be a number`);
        }
        const value = Number(data[field]);
        if (!Number.isFinite(value) || value < min || value > max) {
          invalid(`${field} must be between ${min} and ${max}`);
        }
      }
    }
    if (data.is_default !== undefined && typeof data.is_default !== 'boolean' &&
      data.is_default !== 0 && data.is_default !== 1) {
      invalid('is_default must be a boolean');
    }
    const id = Number(req.params.id);
    if (req.params.id !== undefined && (!Number.isSafeInteger(id) || id < 1)) {
      invalid('id must be a positive integer');
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports.validateId = function validateAddressId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return next(new AppError('id must be a positive integer', 400, 'VALIDATION_ERROR'));
  }
  return next();
};
