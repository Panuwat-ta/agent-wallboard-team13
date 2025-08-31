// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import routes และ middleware
const agentRoutes = require('./routes/agents');
const messageRoutes = require('./routes/messages');
const dashboardRoutes = require('./routes/dashboard');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// WebSocket setup
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  }
});

const PORT = process.env.PORT || 3001;

// 🔒 Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 🌐 CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// 📦 Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 📝 Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// 🏥 Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Agent Wallboard Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// 🛣️ API Routes
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 🚫 Handle 404 // แก้ครับ เวอร์ชันใหม่ ใช้ app.all(/.*/, …) แล้วครับ
app.all(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// 🚨 Global Error Handler
app.use(errorHandler);


// แทนที่ WebSocket section เดิม
// 📡 WebSocket Connection Management
const connectedClients = new Map(); // เก็บ client connections

io.on('connection', (socket) => {
  logger.info(`WebSocket connected: ${socket.id}`, {
    userAgent: socket.request.headers['user-agent'],
    ip: socket.request.connection.remoteAddress
  });

  // Handle client registration
  socket.on('register', (data) => {
    const { userType, userId } = data; // userType: 'agent', 'supervisor', 'admin'
    connectedClients.set(socket.id, { userType, userId, connectedAt: new Date() });
    
    logger.info(`Client registered: ${userType} - ${userId}`, { socketId: socket.id });
    
    // Send welcome message
    socket.emit('registered', {
      message: 'Successfully connected to Agent Wallboard System',
      timestamp: new Date().toISOString(),
      connectedClients: connectedClients.size
    });
  });

  // Handle agent status updates
  socket.on('agentStatusChange', (data) => {
    logger.info('WebSocket agent status change:', data);
    // Broadcast to all supervisors and dashboard
    socket.broadcast.emit('agentStatusUpdate', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });

  // Handle messages
  socket.on('sendMessage', (data) => {
    logger.info('WebSocket message:', { 
      from: data.from, 
      to: data.to, 
      type: data.type 
    });
    
    if (data.to === 'all') {
      socket.broadcast.emit('broadcastMessage', data);
    } else {
      // Send to specific agent
      socket.broadcast.emit('privateMessage', data);
    }
  });

  // Heartbeat mechanism
  const heartbeatInterval = setInterval(() => {
    socket.emit('ping', { timestamp: new Date().toISOString() });
  }, 30000);

  socket.on('pong', () => {
    // Client is alive
    logger.debug(`Heartbeat received from ${socket.id}`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    clearInterval(heartbeatInterval);
    const clientInfo = connectedClients.get(socket.id);
    connectedClients.delete(socket.id);
    
    logger.info(`WebSocket disconnected: ${socket.id}`, { 
      reason, 
      clientInfo,
      remainingClients: connectedClients.size 
    });

    // Notify other clients about disconnection if it was an agent
    if (clientInfo && clientInfo.userType === 'agent') {
      socket.broadcast.emit('agentDisconnected', {
        agentId: clientInfo.userId,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Make io available to routes
app.set('io', io);
global.io = io;

// 🚀 Start Server
server.listen(PORT, () => {
  console.log(`🏢 Agent Wallboard Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`📖 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export for testing
module.exports = { app, server, io };