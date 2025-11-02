// Ficheiro: backend/routes/settings.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const logoUploadMiddleware = require('../middlewares/logoUploadMiddleware');
const backgroundUploadMiddleware = require('../middlewares/backgroundUploadMiddleware');
const loginLogoUploadMiddleware = require('../middlewares/loginLogoUploadMiddleware');
const settingsController = require('../controllers/settingsController');

// --- ROTAS DE CONFIGURAÇÕES GERAIS ---

// Leitura das configurações gerais (PÚBLICA)
router.get(
    '/general',
    settingsController.getGeneralSettings
);

// Atualização das configurações gerais
router.post(
    '/general',
    [verifyToken, checkPermission('settings.general.update'), logoUploadMiddleware],
    settingsController.updateGeneralSettings
);

// Atualização da imagem de fundo
router.post(
    '/background',
    [verifyToken, checkPermission('settings.appearance'), backgroundUploadMiddleware],
    settingsController.updateBackgroundImage
);

// Atualização das configurações de aparência da página de login
router.post(
    '/login-appearance',
    [verifyToken, checkPermission('settings.login_page')],
    settingsController.updateLoginAppearanceSettings
);

// Atualização do logo da página de login
router.post(
    '/login-logo',
    [verifyToken, checkPermission('settings.login_page'), loginLogoUploadMiddleware],
    settingsController.updateLoginLogo
);

// --- ROTAS DE CONFIGURAÇÕES DO PORTAL HOTSPOT ---

// Leitura das configurações do hotspot
router.get(
    '/hotspot',
    verifyToken,
    checkPermission('settings.hotspot.read'),
    settingsController.getHotspotSettings
);

// Atualização das configurações do hotspot
router.post(
    '/hotspot',
    verifyToken,
    checkPermission('settings.hotspot.update'),
    settingsController.updateHotspotSettings
);

module.exports = router;

