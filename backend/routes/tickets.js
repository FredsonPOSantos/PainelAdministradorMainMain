// Ficheiro: backend/routes/tickets.js
// Descrição: Define as rotas da API para o sistema de tickets.

const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas de tickets requerem autenticação
router.use(authMiddleware);

// Criar um novo ticket
router.post('/', ticketController.createTicket);

// Obter todos os tickets
router.get('/', ticketController.getAllTickets);

// Obter um ticket específico pelo ID
router.get('/:id', ticketController.getTicketById);

// Adicionar uma mensagem a um ticket
router.post('/:id/messages', ticketController.addMessageToTicket);

// Atribuir um ticket (apenas master)
router.put('/:id/assign', ticketController.assignTicket);

// Mudar o status de um ticket
router.put('/:id/status', ticketController.updateTicketStatus);

// Avaliar um ticket
router.post('/:id/rate', ticketController.addTicketRating);

module.exports = router;
