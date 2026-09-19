const jwt = require("jsonwebtoken");
const {jwtSecret} = require("../config/env");

const optionalAuthenticate = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token =
    authorization && authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!token) return next();

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch {
    req.user = undefined;
  }
  next();
};

module.exports = {optionalAuthenticate};
