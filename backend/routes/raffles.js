// Ficheiro: backend/routes/raffles.js
// Descrição: Define as rotas para o sistema de sorteios.

const express = require('express');
const router = express.Router();
const raffleController = require('../controllers/raffleController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// Rotas para sorteios
// [NOVO] Rotas assíncronas para criação e sorteio (usadas pelo admin_raffles.js)
router.post('/create-async', authMiddleware, checkPermission('raffles.create'), raffleController.createRaffleAsync);
router.post('/:id/draw-async', authMiddleware, checkPermission('raffles.draw'), raffleController.drawWinnerAsync);

// Rotas CRUD padrão
router.get('/', authMiddleware, checkPermission('raffles.read'), raffleController.getAllRaffles);
router.get('/:id', authMiddleware, checkPermission('raffles.read'), raffleController.getRaffleDetails);
router.delete('/:id', authMiddleware, checkPermission('raffles.delete'), raffleController.deleteRaffle);

module.exports = router;
