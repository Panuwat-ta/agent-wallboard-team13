// routes/agents.js
const express = require('express');
const AgentController = require('../controllers/agentController');
const { validate, validateQuery, schemas } = require('../middleware/validation');

const router = express.Router();

// GET /api/agents - ดึงรายชื่อ agents ทั้งหมด
router.get('/', 
  validateQuery(schemas.agentQuery),
  AgentController.getAllAgents
);

// GET /api/agents/:code - ดึงข้อมูล agent เฉพาะตัว
router.get('/:code', AgentController.getAgentByCode);

// POST /api/agents/:code/login - Agent เข้าสู่ระบบ
router.post('/:code/login',
  validate(schemas.agentLogin),
  AgentController.loginAgent
);

// POST /api/agents/:code/logout - Agent ออกจากระบบ  
router.post('/:code/logout', AgentController.logoutAgent);

// PATCH /api/agents/:code/status - อัพเดทสถานะ agent
router.patch('/:code/status',
  validate(schemas.agentStatus),
  AgentController.updateAgentStatus
);

// DELETE /api/agents/:code - ลบ agent (admin only)
router.delete('/:code', AgentController.deleteAgent);

module.exports = router;