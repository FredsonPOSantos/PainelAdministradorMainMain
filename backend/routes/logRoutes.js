// Ficheiro: backend/routes/logRoutes.js
// Descrição: Define as rotas para a funcionalidade de logs de auditoria.

const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rota para buscar os logs de auditoria
// Apenas utilizadores com a permissão 'logs.read' podem aceder (master, por enquanto)
router.get('/activity', verifyToken, checkPermission('logs.read'), logController.getAuditLogs);

// [NOVO] Rota para buscar os logs de erro do sistema
router.get('/system', verifyToken, checkPermission('logs.read'), logController.getSystemLogs);

module.exports = router;