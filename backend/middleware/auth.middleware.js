const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const { jwtSecret } = require('../config/env');

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) return next(new AppError('Authentication token is required', 401));

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch (error) {
    next(new AppError('Invalid or expired authentication token', 401));
  }
};

module.exports = { authenticate };