// models/Message.js
const { MESSAGE_TYPES, MESSAGE_PRIORITY } = require('../config/constants');

class Message {
  constructor(data) {
    this.id = data.id || Date.now() + Math.random();
    this.from = data.from;
    this.fromName = data.fromName;
    this.to = data.to; // agent code หรือ 'all'
    this.toName = data.toName;
    this.message = data.message;
    this.type = data.type || MESSAGE_TYPES.INSTRUCTION;
    this.priority = data.priority || MESSAGE_PRIORITY.NORMAL;
    this.timestamp = data.timestamp || new Date();
    this.read = data.read || false;
    this.delivered = data.delivered || false;
    this.readAt = data.readAt || null;
  }

  markAsRead() {
    this.read = true;
    this.readAt = new Date();
  }

  markAsDelivered() {
    this.delivered = true;
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      fromName: this.fromName,
      to: this.to,
      toName: this.toName,
      message: this.message,
      type: this.type,
      priority: this.priority,
      timestamp: this.timestamp,
      read: this.read,
      delivered: this.delivered,
      readAt: this.readAt
    };
  }
}

// In-memory message storage
const messages = new Map();

// Sample messages
const sampleMessages = [
  new Message({
    id: 1,
    from: 'supervisor1',
    fromName: 'Sarah Wilson',
    to: 'A001',
    toName: 'John Doe',
    message: 'Please check the priority queue - we have VIP customers waiting',
    type: MESSAGE_TYPES.INSTRUCTION,
    priority: MESSAGE_PRIORITY.HIGH,
    timestamp: new Date(Date.now() - 30 * 60000) // 30 minutes ago
  }),
  new Message({
    id: 2,
    from: 'supervisor1',
    fromName: 'Sarah Wilson',
    to: 'all',
    toName: 'All Agents',
    message: 'Team meeting scheduled for 2 PM today in Conference Room A',
    type: MESSAGE_TYPES.NOTIFICATION,
    priority: MESSAGE_PRIORITY.NORMAL,
    timestamp: new Date(Date.now() - 15 * 60000) // 15 minutes ago
  })
];

// Initialize sample data
sampleMessages.forEach(message => {
  messages.set(message.id, message);
});

module.exports = { Message, messages };