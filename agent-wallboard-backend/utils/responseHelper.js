// utils/responseHelper.js
const logger = require('./logger');

class ResponseHelper {
  static success(res, data, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    
    logger.info(`API Success: ${message}`, { statusCode, data });
    return res.status(statusCode).json(response);
  }

  static error(res, message, statusCode = 500, error = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development' && error) {
      response.error = {
        message: error.message,
        stack: error.stack
      };
    }

    logger.error(`API Error: ${message}`, { statusCode, error: error?.message });
    return res.status(statusCode).json(response);
  }

  static validationError(res, errors) {
    const response = {
      success: false,
      message: 'Validation failed',
      errors,
      timestamp: new Date().toISOString()
    };

    logger.warn('Validation Error', { errors });
    return res.status(400).json(response);
  }
}

module.exports = ResponseHelper;