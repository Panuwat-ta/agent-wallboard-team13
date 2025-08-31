// models/Agent.js
const { AGENT_STATUS } = require('../config/constants');

class Agent {
  constructor(data) {
    this.code = data.code;
    this.name = data.name;
    this.status = data.status || AGENT_STATUS.OFFLINE;
    this.loginTime = data.loginTime || null;
    this.logoutTime = data.logoutTime || null;
    this.lastStatusChange = data.lastStatusChange || new Date();
    this.totalCalls = data.totalCalls || 0;
    this.totalCallTime = data.totalCallTime || 0; // in seconds
    this.skills = data.skills || [];
    this.supervisor = data.supervisor || null;
    this.department = data.department || 'General';
    this.statusReason = data.statusReason || null;
    this.sessionId = data.sessionId || null;
    this.ipAddress = data.ipAddress || null;
    this.lastActivity = data.lastActivity || new Date();
  }

  // Agent methods
  updateStatus(newStatus, reason = null) {
    if (!Object.values(AGENT_STATUS).includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }
    
    this.status = newStatus;
    this.lastStatusChange = new Date();
    this.statusReason = reason;
    this.lastActivity = new Date();
  }

  login(sessionId = null, ipAddress = null) {
    this.status = AGENT_STATUS.AVAILABLE;
    this.loginTime = new Date();
    this.logoutTime = null;
    this.sessionId = sessionId;
    this.ipAddress = ipAddress;
    this.lastActivity = new Date();
  }

  logout() {
    this.status = AGENT_STATUS.OFFLINE;
    this.logoutTime = new Date();
    this.sessionId = null;
    this.lastActivity = new Date();
  }

  incrementCallCount() {
    this.totalCalls++;
    this.lastActivity = new Date();
  }

  addCallTime(seconds) {
    this.totalCallTime += seconds;
    this.lastActivity = new Date();
  }

  getAverageCallTime() {
    if (this.totalCalls === 0) return 0;
    return Math.round(this.totalCallTime / this.totalCalls);
  }

  isOnline() {
    return this.status !== AGENT_STATUS.OFFLINE;
  }

  toJSON() {
    return {
      code: this.code,
      name: this.name,
      status: this.status,
      loginTime: this.loginTime,
      logoutTime: this.logoutTime,
      lastStatusChange: this.lastStatusChange,
      totalCalls: this.totalCalls,
      averageCallTime: this.getAverageCallTime(),
      skills: this.skills,
      supervisor: this.supervisor,
      department: this.department,
      statusReason: this.statusReason,
      lastActivity: this.lastActivity,
      isOnline: this.isOnline()
    };
  }
}

// In-memory storage (จะเปลี่ยนเป็น database ในสัปดาห์หน้า)
const agents = new Map();

// Sample data
const sampleAgents = [
  new Agent({
    code: 'A001',
    name: 'John Doe',
    status: AGENT_STATUS.AVAILABLE,
    skills: ['English', 'Technical Support'],
    supervisor: 'S001',
    department: 'Technical'
  }),
  new Agent({
    code: 'A002', 
    name: 'Jane Smith',
    status: AGENT_STATUS.ACTIVE,
    skills: ['English', 'Sales'],
    supervisor: 'S001',
    department: 'Sales'
  }),
  new Agent({
    code: 'A003',
    name: 'Mike Johnson', 
    status: AGENT_STATUS.NOT_READY,
    skills: ['Thai', 'Customer Service'],
    supervisor: 'S002',
    department: 'Support'
  })
];

// Initialize sample data
sampleAgents.forEach(agent => {
  agents.set(agent.code, agent);
});

module.exports = { Agent, agents };