const AppError = require('./AppError');
const model = require('../models/adminModel');

function requireRole(actor, role) {
  if (!actor || actor.role !== role) {
    throw new AppError('You are not allowed to view these reports', 403, 'FORBIDDEN');
  }
}

function validatePeriod(filter = {}) {
  for (const key of ['from', 'to']) {
    if (
      filter[key] !== undefined &&
      (typeof filter[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(filter[key]))
    ) {
      throw new AppError(`${key} must use YYYY-MM-DD format`, 400, 'VALIDATION_ERROR');
    }
    if (filter[key] !== undefined) {
      const [year, month, day] = filter[key].split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
      ) {
        throw new AppError(`${key} must be a valid calendar date`, 400, 'VALIDATION_ERROR');
      }
    }
  }
  if (filter.from && filter.to && filter.from > filter.to) {
    throw new AppError('from must be on or before to', 400, 'VALIDATION_ERROR');
  }
}

function groupByValue(value, allowed) {
  const groupBy = value || allowed[0];
  if (!allowed.includes(groupBy)) {
    throw new AppError(`groupBy must be one of: ${allowed.join(', ')}`, 400, 'VALIDATION_ERROR');
  }
  return groupBy;
}

module.exports = {
  async adminSummary(actor) {
    requireRole(actor, 'ADMIN');
    return model.getReportSummary();
  },
  async adminRevenue(filter, actor) {
    requireRole(actor, 'ADMIN');
    validatePeriod(filter);
    return model.getAdminRevenue(filter, groupByValue(filter.groupBy, ['day', 'month']));
  },
  async restaurantRevenue(filter, actor) {
    requireRole(actor, 'RESTAURANT');
    validatePeriod(filter);
    const restaurantId = Number(actor.restaurantId);
    if (!Number.isSafeInteger(restaurantId) || restaurantId < 1) {
      throw new AppError('Restaurant account is not available', 403, 'FORBIDDEN');
    }
    return model.getRestaurantRevenue(
      restaurantId,
      filter,
      groupByValue(filter.groupBy, ['day', 'week', 'month'])
    );
  },
};
