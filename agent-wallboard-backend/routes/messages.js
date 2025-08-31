// routes/messages.js
const express = require('express');
const MessageController = require('../controllers/messageController');
const { validate, schemas } = require('../middleware/validation');

const router = express.Router();

// POST /api/messages - ส่งข้อความ
router.post('/', 
  validate(schemas.sendMessage),
  MessageController.sendMessage
);

// GET /api/messages - ดึงข้อความทั้งหมด (admin/supervisor)
router.get('/', MessageController.getAllMessages);

// GET /api/messages/agent/:code - ดึงข้อความของ agent เฉพาะ
router.get('/agent/:code', MessageController.getAgentMessages);

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', MessageController.markMessageAsRead);

module.exports = router;