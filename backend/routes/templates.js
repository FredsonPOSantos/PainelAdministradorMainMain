// Ficheiro: routes/templates.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');

// --- Rotas para Templates ---

// Criar um novo template
router.post(
  '/',
  [authMiddleware, checkPermission('templates.create')],
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
  [authMiddleware, checkPermission('templates.update')],
  templateController.updateTemplate
);

// Eliminar um template
router.delete(
  '/:id',
  [authMiddleware, checkPermission('templates.delete')],
  templateController.deleteTemplate
);

module.exports = router;
