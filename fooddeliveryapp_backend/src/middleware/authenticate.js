const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const authModel = require('../models/authModel');
const AppError = require('../services/AppError');

module.exports = async function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization && /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) {
    return next(new AppError('Bearer token is required', 401, 'UNAUTHENTICATED'));
  }

  let payload;
  try {
    payload = jwt.verify(match[1], jwtSecret, {
      issuer: 'food-delivery-backend',
      audience: 'food-delivery-api',
      algorithms: ['HS256'],
    });
  } catch {
    return next(new AppError('Token is invalid or expired', 401, 'INVALID_TOKEN'));
  }

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    !/^[1-9]\d*$/.test(payload.sub) ||
    !Number.isSafeInteger(Number(payload.sub))
  ) {
    return next(new AppError('Token is invalid', 401, 'INVALID_TOKEN'));
  }

  try {
    const identity = await authModel.getAuthorizationIdentityById(Number(payload.sub));
    if (!identity) {
      return next(new AppError('Account is unavailable', 401, 'INVALID_TOKEN'));
    }
    if (identity.user_status !== 'ACTIVE') {
      return next(new AppError('Account is locked or inactive', 403, 'ACCOUNT_LOCKED'));
    }
    if (
      identity.role === 'RESTAURANT' &&
      ['SUSPENDED', 'REJECTED'].includes(identity.restaurant_status)
    ) {
      return next(new AppError('Restaurant account is suspended', 403, 'ACCOUNT_SUSPENDED'));
    }

    req.user = {
      userId: identity.user_id,
      role: identity.role,
      customerId: identity.customer_id,
      restaurantId: identity.restaurant_id,
      restaurantStatus: identity.restaurant_status,
      shipperId: identity.shipper_id,
      adminId: identity.admin_id,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};
