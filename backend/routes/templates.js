// Ficheiro: routes/templates.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const uploadMiddlewareHotspot = require('../middlewares/uploadMiddlewareHotspot'); // 1. Importar o novo middleware

// --- Rotas para Templates ---

// Criar um novo template
router.post(
  '/',
  [authMiddleware, checkPermission('templates.create'), uploadMiddlewareHotspot], // 2. Aplicar o middleware
  templateController.createTemplate
);

// Listar todos os templates
router.get(
  '/',
  [authMiddleware, checkPermission('templates.read')],
  templateController.getAllTemplates
);

// Atualizar um template
router.put(
  '/:id',
  [authMiddleware, checkPermission('templates.update'), uploadMiddlewareHotspot], // 3. Aplicar o middleware
  templateController.updateTemplate
);

// Eliminar um template
router.delete(
  '/:id',
  [authMiddleware, checkPermission('templates.delete')],
  templateController.deleteTemplate
);

module.exports = router;
