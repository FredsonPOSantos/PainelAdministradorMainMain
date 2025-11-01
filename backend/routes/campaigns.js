// Ficheiro: routes/campaigns.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// --- Rotas para Campanhas ---

// Criar uma nova campanha
router.post(
  '/',
  [authMiddleware, checkPermission('campaigns.create')],
  campaignController.createCampaign
);

// Listar todas as campanhas
router.get(
  '/',
  [authMiddleware, checkPermission('campaigns.read')],
  campaignController.getAllCampaigns
);

// Atualizar uma campanha
router.put(
  '/:id',
  [authMiddleware, checkPermission('campaigns.update')],
  campaignController.updateCampaign
);

// Eliminar uma campanha
router.delete(
  '/:id',
  [authMiddleware, checkPermission('campaigns.delete')],
  campaignController.deleteCampaign
);

module.exports = router;
