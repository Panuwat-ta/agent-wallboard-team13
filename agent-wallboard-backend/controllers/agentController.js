// controllers/agentController.js
const { Agent, agents } = require('../models/Agent');
const { AGENT_STATUS, API_RESPONSES } = require('../config/constants');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

class AgentController {
  // GET /api/agents - ดึงรายชื่อ agents ทั้งหมด
  static async getAllAgents(req, res) {
    try {
      const { status, supervisor, department, skills } = req.validatedQuery || req.query;
      
      let filteredAgents = Array.from(agents.values());

      // Apply filters
      if (status) {
        filteredAgents = filteredAgents.filter(agent => agent.status === status);
      }
      
      if (supervisor) {
        filteredAgents = filteredAgents.filter(agent => agent.supervisor === supervisor);
      }
      
      if (department) {
        filteredAgents = filteredAgents.filter(agent => agent.department === department);
      }
      
      if (skills) {
        const skillsArray = skills.split(',').map(s => s.trim());
        filteredAgents = filteredAgents.filter(agent =>
          skillsArray.some(skill => agent.skills.includes(skill))
        );
      }

      // Generate statistics
      const stats = {
        total: agents.size,
        online: Array.from(agents.values()).filter(a => a.isOnline()).length,
        available: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.AVAILABLE).length,
        active: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.ACTIVE).length,
        wrapUp: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.WRAP_UP).length,
        notReady: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.NOT_READY).length,
        offline: Array.from(agents.values()).filter(a => a.status === AGENT_STATUS.OFFLINE).length
      };

      return ResponseHelper.success(res, {
        agents: filteredAgents.map(agent => agent.toJSON()),
        stats,
        count: filteredAgents.length,
        filters: { status, supervisor, department, skills }
      }, 'Agents retrieved successfully');

    } catch (error) {
      logger.error('Error in getAllAgents:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // GET /api/agents/:code - ดึงข้อมูล agent เฉพาะตัว
  static async getAgentByCode(req, res) {
    try {
      const { code } = req.params;
      const agent = agents.get(code);

      if (!agent) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.AGENT_NOT_FOUND, 404);
      }

      return ResponseHelper.success(res, agent.toJSON(), 'Agent retrieved successfully');

    } catch (error) {
      logger.error('Error in getAgentByCode:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // POST /api/agents/:code/login - Agent เข้าสู่ระบบ
  static async loginAgent(req, res) {
    try {
      const { code } = req.params;
      const { name, skills, supervisor, department } = req.validatedData;
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ipAddress = req.ip;

      let agent = agents.get(code);

      if (!agent) {
        // สร้าง agent ใหม่
        agent = new Agent({
          code,
          name,
          skills: skills || [],
          supervisor: supervisor || 'S001',
          department: department || 'General'
        });
        agents.set(code, agent);
      } else {
        // อัพเดทข้อมูล agent ที่มีอยู่
        agent.name = name || agent.name;
        agent.skills = skills || agent.skills;
        agent.supervisor = supervisor || agent.supervisor;
        agent.department = department || agent.department;
      }

      agent.login(sessionId, ipAddress);

      // Broadcast agent login event via WebSocket
      const io = req.app.get('io') || global.io;
      if (io) {
        io.emit('agentLogin', {
          agentCode: code,
          agent: agent.toJSON(),
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Agent logged in: ${code}`, { 
        name: agent.name, 
        sessionId, 
        ipAddress 
      });

      return ResponseHelper.success(res, {
        agent: agent.toJSON(),
        sessionId
      }, API_RESPONSES.SUCCESS.AGENT_LOGIN, 201);

    } catch (error) {
      logger.error('Error in loginAgent:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // POST /api/agents/:code/logout - Agent ออกจากระบบ
  static async logoutAgent(req, res) {
    try {
      const { code } = req.params;
      const agent = agents.get(code);

      if (!agent) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.AGENT_NOT_FOUND, 404);
      }

      agent.logout();

      // Broadcast agent logout event
      const io = req.app.get('io') || global.io;
      if (io) {
        io.emit('agentLogout', {
          agentCode: code,
          agent: agent.toJSON(),
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Agent logged out: ${code}`);

      return ResponseHelper.success(res, agent.toJSON(), API_RESPONSES.SUCCESS.AGENT_LOGOUT);

    } catch (error) {
      logger.error('Error in logoutAgent:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // PATCH /api/agents/:code/status - อัพเดทสถานะ agent
  static async updateAgentStatus(req, res) {
    try {
      const { code } = req.params;
      const { status, reason } = req.validatedData;
      
      const agent = agents.get(code);

      if (!agent) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.AGENT_NOT_FOUND, 404);
      }

      const oldStatus = agent.status;
      agent.updateStatus(status, reason);

      // Broadcast status change event
      const io = req.app.get('io') || global.io;
      if (io) {
        io.emit('agentStatusUpdate', {
          agentCode: code,
          oldStatus,
          newStatus: status,
          agent: agent.toJSON(),
          timestamp: new Date().toISOString()
        });
      }

      logger.info(`Agent status updated: ${code}`, { 
        oldStatus, 
        newStatus: status, 
        reason 
      });

      return ResponseHelper.success(res, {
        agent: agent.toJSON(),
        statusChange: {
          from: oldStatus,
          to: status,
          reason,
          timestamp: agent.lastStatusChange
        }
      }, API_RESPONSES.SUCCESS.AGENT_STATUS_UPDATED);

    } catch (error) {
      if (error.message.includes('Invalid status')) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.INVALID_STATUS, 400, error);
      }
      
      logger.error('Error in updateAgentStatus:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }

  // DELETE /api/agents/:code - ลบ agent (สำหรับ admin)
  static async deleteAgent(req, res) {
    try {
      const { code } = req.params;
      const agent = agents.get(code);

      if (!agent) {
        return ResponseHelper.error(res, API_RESPONSES.ERROR.AGENT_NOT_FOUND, 404);
      }

      agents.delete(code);

      logger.info(`Agent deleted: ${code}`);

      return ResponseHelper.success(res, { 
        deletedAgent: agent.toJSON() 
      }, 'Agent deleted successfully');

    } catch (error) {
      logger.error('Error in deleteAgent:', error);
      return ResponseHelper.error(res, API_RESPONSES.ERROR.SERVER_ERROR, 500, error);
    }
  }
}

module.exports = AgentController;