// Ficheiro: backend/routes/dashboard.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

router.get(
  '/stats',
  [authMiddleware, checkPermission('dashboard.read')],
  dashboardController.getDashboardStats
);

module.exports = router;