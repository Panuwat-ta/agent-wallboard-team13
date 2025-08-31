// controllers/dashboardController.js
const { agents } = require('../models/Agent');
const { messages } = require('../models/Message');
const { AGENT_STATUS } = require('../config/constants');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

class DashboardController {
  // GET /api/dashboard/stats - สถิติ real-time
  static async getStats(req, res) {
    try {
      const agentList = Array.from(agents.values());
      const messageList = Array.from(messages.values());
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Agent statistics
      const agentStats = {
        total: agentList.length,
        online: agentList.filter(a => a.isOnline()).length,
        available: agentList.filter(a => a.status === AGENT_STATUS.AVAILABLE).length,
        active: agentList.filter(a => a.status === AGENT_STATUS.ACTIVE).length,
        wrapUp: agentList.filter(a => a.status === AGENT_STATUS.WRAP_UP).length,
        notReady: agentList.filter(a => a.status === AGENT_STATUS.NOT_READY).length,
        offline: agentList.filter(a => a.status === AGENT_STATUS.OFFLINE).length
      };

      // Message statistics
      const todayMessages = messageList.filter(msg => new Date(msg.timestamp) >= todayStart);
      const messageStats = {
        total: messageList.length,
        today: todayMessages.length,
        unread: messageList.filter(msg => !msg.read).length,
        high_priority: messageList.filter(msg => msg.priority === 'high' || msg.priority === 'urgent').length
      };

      // Performance metrics
      const onlineAgents = agentList.filter(a => a.isOnline());
      const totalCalls = onlineAgents.reduce((sum, agent) => sum + agent.totalCalls, 0);
      const totalCallTime = onlineAgents.reduce((sum, agent) => sum + agent.totalCallTime, 0);

      const performanceStats = {
        totalCalls,
        averageCallTime: onlineAgents.length > 0 ? Math.round(totalCallTime / Math.max(totalCalls, 1)) : 0,
        callsPerAgent: onlineAgents.length > 0 ? Math.round(totalCalls / onlineAgents.length) : 0,
        activeRate: agentStats.total > 0 ? Math.round((agentStats.online / agentStats.total) * 100) : 0
      };

      // Department breakdown
      const departments = {};
      agentList.forEach(agent => {
        if (!departments[agent.department]) {
          departments[agent.department] = {
            total: 0,
            online: 0,
            available: 0,
            active: 0
          };
        }
        departments[agent.department].total++;
        if (agent.isOnline()) departments[agent.department].online++;
        if (agent.status === AGENT_STATUS.AVAILABLE) departments[agent.department].available++;
        if (agent.status === AGENT_STATUS.ACTIVE) departments[agent.department].active++;
      });

      return ResponseHelper.success(res, {
        agents: agentStats,
        messages: messageStats,
        performance: performanceStats,
        departments,
        lastUpdated: new Date().toISOString(),
        systemInfo: {
          uptime: process.uptime(),
          environment: process.env.NODE_ENV
        }
      }, 'Dashboard statistics retrieved successfully');

    } catch (error) {
      logger.error('Error in getStats:', error);
      return ResponseHelper.error(res, 'Error retrieving dashboard statistics', 500, error);
    }
  }

  // GET /api/dashboard/agents/performance - Agent performance metrics
  static async getAgentPerformance(req, res) {
    try {
      const agentList = Array.from(agents.values());
      
      const performanceData = agentList.map(agent => ({
        code: agent.code,
        name: agent.name,
        status: agent.status,
        department: agent.department,
        totalCalls: agent.totalCalls,
        averageCallTime: agent.getAverageCallTime(),
        loginTime: agent.loginTime,
        lastActivity: agent.lastActivity,
        isOnline: agent.isOnline(),
        productivity: agent.totalCalls > 0 ? Math.round((agent.totalCalls / Math.max(1, Math.floor((new Date() - new Date(agent.loginTime || new Date())) / (1000 * 60 * 60)))) * 100) / 100 : 0 // calls per hour
      })).sort((a, b) => b.totalCalls - a.totalCalls); // Sort by call count

      const topPerformers = performanceData
        .filter(agent => agent.isOnline)
        .slice(0, 5);

      return ResponseHelper.success(res, {
        allAgents: performanceData,
        topPerformers,
        summary: {
          totalAgents: performanceData.length,
          onlineAgents: performanceData.filter(a => a.isOnline).length,
          totalCalls: performanceData.reduce((sum, a) => sum + a.totalCalls, 0),
          averageProductivity: performanceData.filter(a => a.isOnline).reduce((sum, a) => sum + a.productivity, 0) / Math.max(1, performanceData.filter(a => a.isOnline).length)
        }
      }, 'Agent performance data retrieved successfully');

    } catch (error) {
      logger.error('Error in getAgentPerformance:', error);
      return ResponseHelper.error(res, 'Error retrieving agent performance', 500, error);
    }
  }

  // GET /api/dashboard/activity/recent - Recent activities
  static async getRecentActivity(req, res) {
    try {
      const { limit = 20 } = req.query;
      const agentList = Array.from(agents.values());
      const messageList = Array.from(messages.values());

      // สร้าง activity log จาก agent status changes และ messages
      const activities = [];

      // Agent activities
      agentList.forEach(agent => {
        if (agent.loginTime) {
          activities.push({
            type: 'agent_login',
            agentCode: agent.code,
            agentName: agent.name,
            timestamp: agent.loginTime,
            description: `${agent.name} logged in`,
            status: agent.status
          });
        }

        if (agent.lastStatusChange) {
          activities.push({
            type: 'status_change',
            agentCode: agent.code,
            agentName: agent.name,
            timestamp: agent.lastStatusChange,
            description: `${agent.name} changed status to ${agent.status}`,
            status: agent.status
          });
        }
      });

      // Message activities
      messageList.forEach(message => {
        activities.push({
          type: 'message_sent',
          from: message.from,
          fromName: message.fromName,
          to: message.to,
          toName: message.toName,
          timestamp: message.timestamp,
          description: `Message sent from ${message.fromName} to ${message.toName}`,
          priority: message.priority,
          messageType: message.type
        });
      });

      // Sort by timestamp (newest first) and limit
      const recentActivities = activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, parseInt(limit));

      return ResponseHelper.success(res, {
        activities: recentActivities,
        count: recentActivities.length,
        totalActivities: activities.length
      }, 'Recent activities retrieved successfully');

    } catch (error) {
      logger.error('Error in getRecentActivity:', error);
      return ResponseHelper.error(res, 'Error retrieving recent activities', 500, error);
    }
  }
}

module.exports = DashboardController;