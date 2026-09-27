const AppError = require('../services/AppError');

module.exports = function authorizeRoles(...roles) {
  return function roleAuthorization(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You are not allowed to perform this operation', 403, 'FORBIDDEN'));
    }
    return next();
  };
};
