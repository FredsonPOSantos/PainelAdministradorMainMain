// Ficheiro: routes/routers.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]

const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const routerController = require('../controllers/routerController');

// --- ROTAS DE ROTEADORES INDIVIDUAIS ---
router.get('/', verifyToken, checkPermission('routers.read'), routerController.getAllRouters);
router.put('/:id', verifyToken, checkPermission('routers.update'), routerController.updateRouter);
router.delete('/:id', verifyToken, checkPermission('routers.delete'), routerController.deleteRouter);

// [NOVO] Rota para exclusão permanente de um roteador
router.delete('/:id/permanent', verifyToken, checkPermission('routers.individual.delete_permanent'), routerController.deleteRouterPermanently);

// --- ROTA DE VERIFICAÇÃO DE STATUS ---
router.post('/:id/ping', verifyToken, checkPermission('routers.read'), routerController.checkRouterStatus);

// [NOVO] Rota para reiniciar o roteador
router.post('/:id/reboot', verifyToken, checkPermission('routers.update'), routerController.rebootRouter);

// [NOVO] Rota para obter o status de todos os roteadores para a página de monitoramento
router.get('/status', verifyToken, checkPermission('routers.read'), routerController.getRoutersStatus);

// --- ROTAS DE DETEÇÃO AUTOMÁTICA ---
router.get('/discover', verifyToken, checkPermission('routers.create'), routerController.discoverNewRouters);
router.post('/batch-add', verifyToken, checkPermission('routers.create'), routerController.batchAddRouters);

// --- ROTAS DE GRUPOS DE ROTEADORES ---
router.get('/groups', verifyToken, checkPermission('routers.read'), routerController.getAllRouterGroups);
router.post('/groups', verifyToken, checkPermission('routers.create'), routerController.createRouterGroup);
router.put('/groups/:id', verifyToken, checkPermission('routers.update'), routerController.updateRouterGroup);
router.delete('/groups/:id', verifyToken, checkPermission('routers.delete'), routerController.deleteRouterGroup);

module.exports = router;
