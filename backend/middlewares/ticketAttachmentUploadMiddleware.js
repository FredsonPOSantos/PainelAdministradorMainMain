// Ficheiro: middlewares/ticketAttachmentUploadMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define o caminho para a pasta de uploads de anexos de tickets
// Aponta para backend/public/uploads/ticket_attachments
const uploadDir = path.join(__dirname, '../public/uploads/ticket_attachments');

// Garante que o diretório de upload exista
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  // Define a pasta de destino para os ficheiros
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  // Define como o ficheiro será nomeado
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Sanitiza o nome original para evitar problemas com caracteres especiais
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, 'attachment-' + uniqueSuffix + '-' + sanitizedOriginalName);
  }
});

// Configuração final do Multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

module.exports = upload;