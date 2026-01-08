// Ficheiro: backend/routes/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rotas do Dashboard
router.get('/stats', verifyToken, checkPermission('dashboard.read'), dashboardController.getDashboardStats);
router.get('/analytics', verifyToken, checkPermission('analytics.read'), dashboardController.getAnalyticsStats);
router.get('/health', verifyToken, checkPermission('system_health.read'), dashboardController.getSystemHealth);
router.get('/router-users', verifyToken, checkPermission('routers.read'), dashboardController.getRouterUsers);

module.exports = router;