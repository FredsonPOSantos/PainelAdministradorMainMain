// Ficheiro: middlewares/ticketAttachmentUploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'public/uploads/ticket_attachments/';

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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attachment-' + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = upload;