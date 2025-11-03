// Ficheiro: backend/routes/logRoutes.js
// Descrição: Define as rotas para a visualização de logs de auditoria.

const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/logController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rota para buscar os logs de auditoria
// Apenas utilizadores com a permissão 'logs.read' podem aceder
router.get('/', authMiddleware, checkPermission('logs.read'), getAuditLogs);

module.exports = router;
