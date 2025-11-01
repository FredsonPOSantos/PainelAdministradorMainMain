// Ficheiro: backend/routes/permissions.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();

// --- Middlewares ---
const verifyToken = require('../middlewares/authMiddleware');
// [ALTERADO] Trocamos checkRole por checkPermission
const checkPermission = require('../middlewares/roleMiddleware'); 

// --- Controller ---
const permissionsController = require('../controllers/permissionsController');

// --- ROTA PARA OBTER A MATRIZ DE PERMISSÕES ---
// GET /api/permissions/matrix
// Acessível por quem tem a permissão 'permissions.read'
router.get(
    '/matrix',
    verifyToken, 
    checkPermission('permissions.read'), // Apenas quem pode ler permissões
    permissionsController.getPermissionsMatrix 
);

// --- ROTA PARA SALVAR EM LOTE ---
// POST /api/permissions/update-batch
// Acessível apenas por quem tem a permissão 'permissions.update'
router.post(
    '/update-batch',
    verifyToken,
    checkPermission('permissions.update'), // Apenas quem pode editar permissões
    permissionsController.updatePermissionsBatch
);

module.exports = router;

