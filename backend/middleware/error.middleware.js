const {nodeEnv} = require("../config/env");

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
};

const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message:
      error.isOperational || nodeEnv === "development"
        ? error.message
        : "Internal server error",
    data: null,
  };

  if (nodeEnv === "development" && !error.isOperational) {
    response.error = error.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {notFound, errorHandler};
