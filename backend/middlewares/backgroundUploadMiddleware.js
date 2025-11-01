// Ficheiro: middlewares/backgroundUploadMiddleware.js
// Descrição: Middleware para lidar com o upload da imagem de fundo do login.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadPath = 'public/uploads/Background/';

if (!fs.existsSync(uploadPath)) {
    try {
        fs.mkdirSync(uploadPath, { recursive: true });
        console.log(`[MW-UploadBackground] Diretório criado: ${uploadPath}`);
    } catch (err) {
        console.error(`[MW-UploadBackground] ERRO ao criar diretório ${uploadPath}:`, err);
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
    cb(null, 'background' + fileExtension);
  }
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
        console.log(`[MW-UploadBackground] Ficheiro permitido: ${file.originalname} (MIME: ${file.mimetype})`);
        cb(null, true);
    } else {
        console.warn(`[MW-UploadBackground] Ficheiro REJEITADO: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${fileExt})`);
        cb(new Error('Tipo de ficheiro inválido. Apenas imagens (jpg, png) são permitidas.'), false);
    }
};

const uploadBackground = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 Megabytes
  }
});

const backgroundUploadMiddleware = (req, res, next) => {
    const upload = uploadBackground.single('backgroundImage');

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            console.error('[MW-UploadBackground] Erro do Multer:', err);
             if (err.code === 'LIMIT_FILE_SIZE') {
                 return res.status(400).json({ message: 'Erro no upload: Ficheiro demasiado grande (Máx 2MB).' });
             }
             return res.status(400).json({ message: `Erro no upload: ${err.message}` });
        } else if (err) {
            console.error('[MW-UploadBackground] Erro inesperado no upload:', err);
             if (err.message.includes('Tipo de ficheiro inválido')) {
                  return res.status(400).json({ message: err.message });
             }
            return res.status(500).json({ message: 'Erro interno no servidor durante o upload do ficheiro.' });
        }
        console.log('[MW-UploadBackground] Upload processado (ou nenhum ficheiro enviado). req.file:', req.file ? req.file.filename : 'Nenhum');
        next();
    });
};

module.exports = backgroundUploadMiddleware;
