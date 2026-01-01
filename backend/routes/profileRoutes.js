// Ficheiro: backend/routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const verifyToken = require('../middlewares/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do Multer para Avatars
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // [CORRIGIDO] Salva dentro de 'public/uploads' para ser acessível via URL
        const dir = path.join(__dirname, '../public/uploads/avatars');
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Nome único: avatar-USERID-TIMESTAMP.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas.'));
        }
    }
});

// Todas as rotas requerem autenticação
router.use(verifyToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/theme', profileController.updateTheme);
router.post('/change-own-password', profileController.changePassword);
router.post('/avatar', upload.single('avatar'), profileController.uploadAvatar);

module.exports = router;
