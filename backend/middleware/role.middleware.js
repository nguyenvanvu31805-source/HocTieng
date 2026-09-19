const AppError = require('../utils/appError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to access this resource', 403));
  }
  next();
};

module.exports = { authorize };