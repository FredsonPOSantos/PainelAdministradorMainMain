// Ficheiro: routes/banners.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');

// --- Rotas para Banners ---

// Upload de imagem de banner (Criação)
router.post(
  '/upload',
  [authMiddleware, checkPermission('banners.create'), uploadMiddleware.single('bannerImage')],
  bannerController.uploadBannerImage
);

// Criar um novo banner (Criação)
router.post(
  '/',
  [authMiddleware, checkPermission('banners.create')],
  bannerController.createBanner
);

// Listar todos os banners (Leitura)
router.get(
  '/',
  [authMiddleware, checkPermission('banners.read')],
  bannerController.getAllBanners
);

// Atualizar um banner (Atualização)
router.put(
  '/:id',
  [authMiddleware, checkPermission('banners.update')],
  bannerController.updateBanner
);

// Eliminar um banner (Deleção)
router.delete(
  '/:id',
  [authMiddleware, checkPermission('banners.delete')],
  bannerController.deleteBanner
);

module.exports = router;
