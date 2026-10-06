const AppError = require('../services/AppError');

function invalid(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function positiveInteger(value, field) {
  if (value === undefined) return undefined;
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    String(value).trim() === ''
  ) {
    invalid(`${field} must be a positive integer`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    invalid(`${field} must be a positive integer`);
  }
  return number;
}

function optionalNumber(query, field, min, max) {
  if (query[field] === undefined) return undefined;
  if (typeof query[field] !== 'string' || query[field].trim() === '') {
    invalid(`${field} must be a number`);
  }
  const value = Number(query[field]);
  if (!Number.isFinite(value) || value < min || value > max) {
    invalid(`${field} must be between ${min} and ${max}`);
  }
  return value;
}

function validateRestaurantList(req, res, next) {
  try {
    const query = req.query;
    if (query.q !== undefined && (typeof query.q !== 'string' || query.q.trim().length > 100)) {
      invalid('q must be a string with at most 100 characters');
    }
    positiveInteger(query.categoryId, 'categoryId');
    const minPrice = optionalNumber(query, 'minPrice', 0, Number.MAX_SAFE_INTEGER);
    const maxPrice = optionalNumber(query, 'maxPrice', 0, Number.MAX_SAFE_INTEGER);
    optionalNumber(query, 'minRating', 0, 5);
    const latitude = optionalNumber(query, 'latitude', -90, 90);
    const longitude = optionalNumber(query, 'longitude', -180, 180);
    const maxDistanceKm = optionalNumber(query, 'maxDistanceKm', 0.01, 1000);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      invalid('minPrice cannot exceed maxPrice');
    }
    if ((latitude === undefined) !== (longitude === undefined)) {
      invalid('latitude and longitude must be provided together');
    }
    if (maxDistanceKm !== undefined && latitude === undefined) {
      invalid('latitude and longitude are required with maxDistanceKm');
    }
    if (query.isOpen !== undefined && !['true', 'false'].includes(query.isOpen)) {
      invalid('isOpen must be true or false');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateMyRestaurantProfile(req, res, next) {
  try {
    const data = req.body;
    const allowed = new Set([
      'name',
      'address',
      'phone',
      'description',
      'latitude',
      'longitude',
      'opening_time',
      'closing_time',
    ]);
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
      Object.keys(data).length === 0 ||
      Object.keys(data).some((field) => !allowed.has(field))) {
      invalid('Request must contain supported Restaurant profile fields');
    }

    for (const [field, maxLength] of [['name', 150], ['address', 255]]) {
      if (data[field] !== undefined &&
        (typeof data[field] !== 'string' || !data[field].trim() || data[field].trim().length > maxLength)) {
        invalid(`${field} must contain between 1 and ${maxLength} characters`);
      }
    }
    if (data.phone !== undefined &&
      (typeof data.phone !== 'string' || !/^\+?[0-9]{8,15}$/.test(data.phone.trim()))) {
      invalid('phone must be a valid phone number');
    }
    if (data.description !== undefined && data.description !== null &&
      (typeof data.description !== 'string' || data.description.length > 2000)) {
      invalid('description must be at most 2000 characters or null');
    }

    for (const [field, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
      if (data[field] === undefined) continue;
      const value = Number(data[field]);
      if ((typeof data[field] !== 'number' && typeof data[field] !== 'string') ||
        String(data[field]).trim() === '' || !Number.isFinite(value) || value < min || value > max) {
        invalid(`${field} must be between ${min} and ${max}`);
      }
      data[field] = value;
    }
    if ((data.latitude === undefined) !== (data.longitude === undefined)) {
      invalid('latitude and longitude must be provided together');
    }

    for (const field of ['opening_time', 'closing_time']) {
      if (data[field] === undefined) continue;
      if (data[field] === null || data[field] === '') {
        data[field] = null;
        continue;
      }
      if (typeof data[field] !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(data[field])) {
        invalid(`${field} must use HH:mm or HH:mm:ss`);
      }
      if (data[field].length === 5) data[field] += ':00';
    }
    if (
      (data.opening_time !== undefined && data.closing_time === undefined) ||
      (data.closing_time !== undefined && data.opening_time === undefined)
    ) {
      invalid('opening_time and closing_time must be provided together');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateFoodList(req, res, next) {
  try {
    const query = req.query;
    if (query.q !== undefined && (typeof query.q !== 'string' || query.q.trim().length > 100)) {
      invalid('q must be a string with at most 100 characters');
    }
    positiveInteger(query.restaurantId, 'restaurantId');
    positiveInteger(query.categoryId, 'categoryId');
    const minPrice = optionalNumber(query, 'minPrice', 0, Number.MAX_SAFE_INTEGER);
    const maxPrice = optionalNumber(query, 'maxPrice', 0, Number.MAX_SAFE_INTEGER);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      invalid('minPrice cannot exceed maxPrice');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateId(req, res, next) {
  try {
    positiveInteger(req.params.id, 'id');
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateFoodWrite(req, res, next) {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      invalid('Request body must be an object');
    }
    const allowed = ['category_id', 'name', 'description', 'price', 'image', 'status_id'];
    if (Object.keys(data).some((key) => !allowed.includes(key))) {
      invalid('Request contains unsupported Food fields');
    }
    if (req.method === 'POST' && (!data.name || data.category_id === undefined || data.price === undefined)) {
      invalid('name, category_id and price are required');
    }
    if (Object.keys(data).length === 0) invalid('At least one Food field is required');
    if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 150)) {
      invalid('name must contain between 1 and 150 characters');
    }
    if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
      invalid('description must be a string or null');
    }
    if (data.image !== undefined && data.image !== null && (typeof data.image !== 'string' || data.image.length > 255)) {
      invalid('image must be a string of at most 255 characters or null');
    }
    if (data.category_id !== undefined) positiveInteger(data.category_id, 'category_id');
    if (data.status_id !== undefined) positiveInteger(data.status_id, 'status_id');
    if (data.price !== undefined) {
      const priceText = String(data.price).trim();
      const price = Number(data.price);
      if (
        (typeof data.price !== 'number' && typeof data.price !== 'string') ||
        priceText === '' ||
        !/^\d+(\.\d{1,2})?$/.test(priceText) ||
        !Number.isFinite(price) ||
        price > 9999999999.99
      ) {
        invalid('price must be a non-negative number with at most two decimal places');
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function validateCategoryWrite(req, res, next) {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      invalid('Request body must be an object');
    }
    const allowed = ['name', 'description', 'is_active'];
    if (Object.keys(data).some((key) => !allowed.includes(key)) || Object.keys(data).length === 0) {
      invalid('Request must contain supported Category fields');
    }
    if (req.method === 'POST' && !data.name) invalid('name is required');
    if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100)) {
      invalid('name must contain between 1 and 100 characters');
    }
    if (data.description !== undefined && data.description !== null &&
      (typeof data.description !== 'string' || data.description.length > 255)) {
      invalid('description must be at most 255 characters or null');
    }
    if (data.is_active !== undefined && typeof data.is_active !== 'boolean' &&
      data.is_active !== 0 && data.is_active !== 1) {
      invalid('is_active must be a boolean');
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  validateRestaurantList,
  validateMyRestaurantProfile,
  validateFoodList,
  validateId,
  validateFoodWrite,
  validateCategoryWrite,
};
