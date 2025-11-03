// Ficheiro: backend/routes/logRoutes.js
// Descrição: Define as rotas para a funcionalidade de logs de auditoria.

const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/logController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/permissionMiddleware');

// Rota para buscar os logs de auditoria
// Apenas utilizadores com a permissão 'logs.read' podem aceder (master, por enquanto)
router.get('/', verifyToken, checkPermission('logs.read'), getAuditLogs);

module.exports = router;