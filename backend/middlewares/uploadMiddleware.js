// Ficheiro: middlewares/uploadMiddleware.js
// [FICHEIRO INALTERADO - Válido]

const multer = require('multer');
const path = require('path');

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  // Define a pasta de destino para os ficheiros
  destination: (req, file, cb) => {
    // É importante que esta pasta exista no seu servidor
    cb(null, 'public/uploads/banners/');
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
  const allowedTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Apenas ficheiros de imagem (jpeg, jpg, png, gif) são permitidos.'));
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
