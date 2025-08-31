// routes/dashboard.js
const express = require('express');
const DashboardController = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/dashboard/stats - สถิติ real-time
router.get('/stats', DashboardController.getStats);

// GET /api/dashboard/agents/performance - Agent performance metrics
router.get('/agents/performance', DashboardController.getAgentPerformance);

// GET /api/dashboard/activity/recent - Recent activities
router.get('/activity/recent', DashboardController.getRecentActivity);

module.exports = router;