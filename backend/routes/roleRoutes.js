// Ficheiro: backend/routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

router.use(verifyToken);

// Listar roles (Acessível a quem pode ver utilizadores ou permissões)
router.get('/', roleController.getRoles);

// Criar role (Apenas Master ou quem tem permissão específica - por enquanto Master)
router.post('/', [checkPermission('permissions.update')], roleController.createRole);

// [NOVO] Eliminar role
router.delete('/:slug', [checkPermission('permissions.update')], roleController.deleteRole);

module.exports = router;
