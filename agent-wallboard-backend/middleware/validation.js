// middleware/validation.js
const Joi = require('joi');
const ResponseHelper = require('../utils/responseHelper');
const { AGENT_STATUS, MESSAGE_TYPES, MESSAGE_PRIORITY } = require('../config/constants');

const schemas = {
  // Agent validation schemas
  agentStatus: Joi.object({
    status: Joi.string().valid(...Object.values(AGENT_STATUS)).required(),
    reason: Joi.string().max(200).optional()
  }),

  agentLogin: Joi.object({
    agentCode: Joi.string().pattern(/^[A-Z]\d{3}$/).required(),
    name: Joi.string().min(2).max(100).required(),
    skills: Joi.array().items(Joi.string()).optional(),
    supervisor: Joi.string().optional(),
    department: Joi.string().optional()
  }),

  // Message validation schemas
  sendMessage: Joi.object({
    from: Joi.string().required(),
    fromName: Joi.string().required(),
    to: Joi.alternatives().try(
      Joi.string().pattern(/^[A-Z]\d{3}$/),
      Joi.string().valid('all')
    ).required(),
    message: Joi.string().min(1).max(500).required(),
    type: Joi.string().valid(...Object.values(MESSAGE_TYPES)).default(MESSAGE_TYPES.INSTRUCTION),
    priority: Joi.string().valid(...Object.values(MESSAGE_PRIORITY)).default(MESSAGE_PRIORITY.NORMAL)
  }),

  // Query validation
  agentQuery: Joi.object({
    status: Joi.string().valid(...Object.values(AGENT_STATUS)).optional(),
    supervisor: Joi.string().optional(),
    department: Joi.string().optional(),
    skills: Joi.string().optional() // comma-separated
  })
};

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return ResponseHelper.validationError(res, errors);
    }
    
    req.validatedData = value;
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return ResponseHelper.validationError(res, errors);
    }
    
    req.validatedQuery = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
  validateQuery
};