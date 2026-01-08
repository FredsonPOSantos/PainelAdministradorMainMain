// Ficheiro: backend/routes/publicTicketRoutes.js
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Rota pública para criar tickets (POST /api/public/tickets)
router.post('/', ticketController.createPublicTicket);

module.exports = router;