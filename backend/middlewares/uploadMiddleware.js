// Ficheiro: middlewares/uploadMiddleware.js
// [FICHEIRO INALTERADO - Válido]

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// [CORRIGIDO] O caminho deve ser relativo ao ficheiro atual e apontar para a pasta public na raiz do projeto.
const uploadDir = path.join(__dirname, '../../public/uploads/banners/');

// Garante que o diretório de upload exista
fs.mkdirSync(uploadDir, { recursive: true });

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  // Define a pasta de destino para os ficheiros
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // Define como o ficheiro será nomeado
  filename: (req, file, cb) => {
    // Para evitar conflitos, o nome do ficheiro será: prefixo-timestamp.extensao
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro para aceitar apenas determinados tipos de ficheiros de imagem
const fileFilter = (req, file, cb) => {
  // Aceita os mimetypes de imagem mais comuns
  const allowedMimeTypes = [
    'image/jpeg', 
    'image/pjpeg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'image/bmp', 
    'image/tiff'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de ficheiro inválido. Apenas ficheiros de imagem são permitidos.'), false);
  }
};

// Configuração final do Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Limite de tamanho do ficheiro (ex: 10MB)
    fileSize: 10 * 1024 * 1024
  }
});

module.exports = upload;
