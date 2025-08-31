// config/constants.js
const AGENT_STATUS = {
  AVAILABLE: 'Available',
  ACTIVE: 'Active',
  WRAP_UP: 'Wrap Up',
  NOT_READY: 'Not Ready',
  OFFLINE: 'Offline'
};

const MESSAGE_TYPES = {
  INSTRUCTION: 'instruction',
  NOTIFICATION: 'notification',
  ALERT: 'alert',
  INFO: 'info'
};

const MESSAGE_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

const API_RESPONSES = {
  SUCCESS: {
    AGENT_STATUS_UPDATED: 'Agent status updated successfully',
    AGENT_LOGIN: 'Agent logged in successfully',
    AGENT_LOGOUT: 'Agent logged out successfully',
    MESSAGE_SENT: 'Message sent successfully'
  },
  ERROR: {
    AGENT_NOT_FOUND: 'Agent not found',
    INVALID_STATUS: 'Invalid agent status',
    VALIDATION_FAILED: 'Validation failed',
    UNAUTHORIZED: 'Unauthorized access',
    SERVER_ERROR: 'Internal server error'
  }
};

module.exports = {
  AGENT_STATUS,
  MESSAGE_TYPES,
  MESSAGE_PRIORITY,
  API_RESPONSES
};