// Ficheiro: routes/admin.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const adminController = require('../controllers/adminController');

// --- ROTA DE PERFIL ---
router.get('/profile', verifyToken, adminController.getUserProfile);
router.post('/profile/change-own-password', verifyToken, adminController.changeOwnPassword);

// --- ROTAS DE GESTÃO DE UTILIZADORES ---

// Lista todos os utilizadores (Leitura)
router.get('/users', verifyToken, checkPermission('users.read'), adminController.getAllAdminUsers);

// Cria um novo utilizador (Criação)
router.post('/users', verifyToken, checkPermission('users.create'), adminController.createAdminUser);

// Atualiza um utilizador por ID (Atualização)
router.put('/users/:id', verifyToken, checkPermission('users.update'), adminController.updateUser);

// Elimina um utilizador por ID (Deleção)
router.delete('/users/:id', verifyToken, checkPermission('users.delete'), adminController.deleteUser);

// Resetar a senha de um utilizador (Ação Especial, pode ser considerada uma 'Atualização')
router.post('/users/:id/reset-password', verifyToken, checkPermission('users.update'), adminController.resetUserPassword);

module.exports = router;

