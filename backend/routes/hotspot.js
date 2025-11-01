// Ficheiro: routes/hotspot.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();
const hotspotController = require('../controllers/hotspotController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rota para pesquisar utilizadores do hotspot
router.get(
    '/users',
    [authMiddleware, checkPermission('hotspot.read')],
    hotspotController.searchUsers
);

// Rota para obter a contagem total de utilizadores do hotspot
router.get(
    '/total-users',
    [authMiddleware, checkPermission('dashboard.read')], // Acesso geral de dashboard
    hotspotController.getTotalHotspotUsers
);

module.exports = router;
