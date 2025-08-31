// middleware/errorHandler.js
const logger = require('../utils/logger');
const ResponseHelper = require('../utils/responseHelper');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Default error
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.message.includes('Agent not found')) {
    statusCode = 404;
    message = err.message;
  }

  return ResponseHelper.error(res, message, statusCode, err);
};

module.exports = errorHandler;