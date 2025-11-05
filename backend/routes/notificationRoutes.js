// Ficheiro: backend/routes/notificationRoutes.js
// Descrição: Define as rotas da API para o sistema de notificações.

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Todas as rotas de notificações requerem autenticação
router.use(authMiddleware);

// Obter a contagem de notificações não lidas
router.get('/unread-count', notificationController.getUnreadCount);

// Marcar todas as notificações como lidas
router.put('/mark-as-read', notificationController.markAllAsRead);

// Obter as últimas notificações não lidas
router.get('/unread', notificationController.getUnreadNotifications);

// Marcar uma notificação específica como lida
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
