// Ficheiro: middlewares/loginLogoUploadMiddleware.js
// Descrição: Middleware para lidar com o upload do logótipo da página de login.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = 'public/uploads/logos/';

if (!fs.existsSync(uploadPath)) {
    try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`[MW-UploadLoginLogo] Diretório criado: ${uploadPath}`);
    } catch (err) {
        console.error(`[MW-UploadLoginLogo] ERRO ao criar diretório ${uploadPath}:`, err);
        throw new Error(`Falha ao criar diretório de upload: ${uploadPath}`);
    }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadPath)) {
         return cb(new Error(`Diretório de destino não existe: ${uploadPath}`), null);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    cb(null, 'login_logo' + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']; // SVG já estava aqui, mas garantimos
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg']; // SVG já estava aqui, mas garantimos
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
        console.log(`[MW-UploadLoginLogo] Ficheiro permitido: ${file.originalname} (MIME: ${file.mimetype})`);
        cb(null, true);
    } else {
        console.warn(`[MW-UploadLoginLogo] Ficheiro REJEITADO: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${fileExt})`);
        cb(new Error('Tipo de ficheiro inválido. Apenas imagens (jpg, png, gif, svg) são permitidas.'), false);
    }
};

const uploadLoginLogo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  }
});

const loginLogoUploadMiddleware = (req, res, next) => {
    const upload = uploadLoginLogo.single('loginLogo');

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('[MW-UploadLoginLogo] Erro do Multer:', err);
             if (err.code === 'LIMIT_FILE_SIZE') {
                 return res.status(400).json({ message: 'Erro no upload: Ficheiro demasiado grande (Máx 5MB).' });
             }
             return res.status(400).json({ message: `Erro no upload: ${err.message}` });
        } else if (err) {
            console.error('[MW-UploadLoginLogo] Erro inesperado no upload:', err);
             if (err.message.includes('Tipo de ficheiro inválido')) {
                  return res.status(400).json({ message: err.message });
             }
            return res.status(500).json({ message: 'Erro interno no servidor durante o upload do ficheiro.' });
        }
        console.log('[MW-UploadLoginLogo] Upload processado. req.file:', req.file ? req.file.filename : 'Nenhum');
        next();
    });
};

module.exports = loginLogoUploadMiddleware;
