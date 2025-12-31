// Ficheiro: backend/routes/raffles.js
// Descrição: Define as rotas para o sistema de sorteios.

const express = require('express');
const router = express.Router();
const raffleController = require('../controllers/raffleController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rotas para sorteios
router.post('/', authMiddleware, checkPermission('raffles.create'), raffleController.createRaffle);
router.get('/', authMiddleware, checkPermission('raffles.read'), raffleController.getAllRaffles);
router.get('/:id', authMiddleware, checkPermission('raffles.read'), raffleController.getRaffleById);
router.put('/:id', authMiddleware, checkPermission('raffles.update'), raffleController.updateRaffle);
router.delete('/:id', authMiddleware, checkPermission('raffles.delete'), raffleController.deleteRaffle);
router.post('/:id/draw', authMiddleware, checkPermission('raffles.draw'), raffleController.drawRaffle); // Já estava correto

// Rotas para obter dados para os filtros
router.get('/data/campaigns', authMiddleware, checkPermission('raffles.read'), raffleController.getCampaigns);
router.get('/data/routers', authMiddleware, checkPermission('raffles.read'), raffleController.getRouters);

module.exports = router;
