// Ficheiro: backend/routes/publicRoutes.js
// Descrição: Define as rotas públicas que não requerem autenticação.

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Rota pública para obter a campanha ativa para um determinado roteador
router.get('/active-campaign', publicController.getActiveCampaign);

module.exports = router;