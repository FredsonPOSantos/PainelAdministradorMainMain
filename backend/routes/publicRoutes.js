// Ficheiro: backend/routes/publicRoutes.js
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Rotas públicas (sem autenticação)
router.get('/active-campaign', publicController.getActiveCampaign);
router.get('/campaign-preview', publicController.getCampaignPreview);

module.exports = router;