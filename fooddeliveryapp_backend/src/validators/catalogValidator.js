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
  validateFoodList,
  validateId,
  validateFoodWrite,
  validateCategoryWrite,
};
