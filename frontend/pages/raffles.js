// Ficheiro: backend/routes/raffles.js

const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const raffleController = require('../controllers/raffleController');

// [NOVO] Rota para criar sorteio de forma assíncrona
router.post('/create-async', verifyToken, checkPermission('raffles.create'), raffleController.createRaffleAsync);

// [NOVO] Rota para realizar sorteio de forma assíncrona
router.post('/:id/draw-async', verifyToken, checkPermission('raffles.draw'), raffleController.drawWinnerAsync);

// Rotas CRUD padrão
router.get('/', verifyToken, checkPermission('raffles.read'), raffleController.getAllRaffles);
router.get('/:id', verifyToken, checkPermission('raffles.read'), raffleController.getRaffleDetails);
router.delete('/:id', verifyToken, checkPermission('raffles.delete'), raffleController.deleteRaffle);

module.exports = router;

