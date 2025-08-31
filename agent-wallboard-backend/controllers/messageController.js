// controllers/messageController.js
const { Message, messages } = require('../models/Message');
const { agents } = require('../models/Agent');
const { API_RESPONSES } = require('../config/constants');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

class MessageController {
  // POST /api/messages - ส่งข้อความ
  static async sendMessage(req, res) {
    try {
      const { from, fromName, to, message, type, priority } = req.validatedData;

      // ตรวจสอบว่า target agent มีอยู่ (ยกเว้น 'all')
      if (to !== 'all') {
        const targetAgent = agents.get(to);
        if (!targetAgent) {
          return ResponseHelper.error(res, `Target agent ${to} not found`, 404);
        }
      }

      // สร้าง message ใหม่
      const newMessage = new Message({
        from,
        fromName,
        to,
        toName: to === 'all' ? 'All Agents' : agents.get(to)?.name || to,
        message: message.trim(),
        type,
        priority
      });

      messages.set(newMessage.id, newMessage);

      // ส่งผ่าน WebSocket
      const io = req.app.get('io') || global.io;
      if (io) {
        if (to === 'all') {
          // Broadcast ไปทุกคน
          io.emit('broadcastMessage', newMessage.toJSON());
          logger.info(`Broadcast message sent from ${from}:`, { 
            message: message.substring(0, 50) + '...',
            type,
            priority 
          });
        } else {
          // ส่งไปเฉพาะ agent เป้าหมาย
          io.emit('privateMessage', {
            targetAgent: to,
            message: newMessage.toJSON()
          });
          logger.info(`Private message sent from ${from} to ${to}:`, { 
            message: message.substring(0, 50) + '...',
            type,
            priority 
          });
        }
      }

      // Mark as delivered
      newMessage.markAsDelivered();

      return ResponseHelper.success(res, newMessage.toJSON(), API_RESPONSES.SUCCESS.MESSAGE_SENT, 201);

    } catch (error) {
      logger.error('Error in sendMessage:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // GET /api/messages/agent/:code - ดึงข้อความของ agent เฉพาะ
  static async getAgentMessages(req, res) {
    try {
      const { code } = req.params;
      const { unreadOnly = false, limit = 50 } = req.query;

      // ตรวจสอบว่า agent มีอยู่
      const agent = agents.get(code);
      if (!agent) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.AGENT_NOT_FOUND, 404);
      }

      // Filter messages สำหรับ agent นี้
      let agentMessages = Array.from(messages.values())
        .filter(msg => msg.to === code || msg.to === 'all')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Filter unread only if requested
      if (unreadOnly === 'true') {
        agentMessages = agentMessages.filter(msg => !msg.read);
      }

      // Apply limit
      agentMessages = agentMessages.slice(0, parseInt(limit));

      // Statistics
      const stats = {
        total: agentMessages.length,
        unread: agentMessages.filter(msg => !msg.read).length,
        high_priority: agentMessages.filter(msg => msg.priority === 'high' || msg.priority === 'urgent').length
      };

      return ResponseHelper.success(res, {
        messages: agentMessages.map(msg => msg.toJSON()),
        stats,
        agent: {
          code: agent.code,
          name: agent.name
        }
      }, 'Messages retrieved successfully');

    } catch (error) {
      logger.error('Error in getAgentMessages:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // PUT /api/messages/:id/read - Mark message as read
  static async markMessageAsRead(req, res) {
    try {
      const { id } = req.params;
      const message = messages.get(parseInt(id));

      if (!message) {
        return ResponseHelper.error(res, 'Message not found', 404);
      }

      message.markAsRead();

      logger.info(`Message ${id} marked as read`);

      return ResponseHelper.success(res, message.toJSON(), 'Message marked as read');

    } catch (error) {
      logger.error('Error in markMessageAsRead:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // GET /api/messages - ดึงข้อความทั้งหมด (สำหรับ admin/supervisor)
  static async getAllMessages(req, res) {
    try {
      const { limit = 100, type, priority, from } = req.query;
      
      let allMessages = Array.from(messages.values())
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply filters
      if (type) {
        allMessages = allMessages.filter(msg => msg.type === type);
      }

      if (priority) {
        allMessages = allMessages.filter(msg => msg.priority === priority);
      }

      if (from) {
        allMessages = allMessages.filter(msg => msg.from === from);
      }

      // Apply limit
      allMessages = allMessages.slice(0, parseInt(limit));

      // Generate statistics
      const stats = {
        total: messages.size,
        unread: Array.from(messages.values()).filter(msg => !msg.read).length,
        by_type: {},
        by_priority: {}
      };

      // Count by type and priority
      Array.from(messages.values()).forEach(msg => {
        stats.by_type[msg.type] = (stats.by_type[msg.type] || 0) + 1;
        stats.by_priority[msg.priority] = (stats.by_priority[msg.priority] || 0) + 1;
      });

      return ResponseHelper.success(res, {
        messages: allMessages.map(msg => msg.toJSON()),
        stats,
        filters: { type, priority, from, limit }
      }, 'All messages retrieved successfully');

    } catch (error) {
      logger.error('Error in getAllMessages:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }
}

module.exports = MessageController;