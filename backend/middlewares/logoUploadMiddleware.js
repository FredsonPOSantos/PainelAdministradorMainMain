// Ficheiro: middlewares/logoUploadMiddleware.js
// Descrição: Middleware para lidar com o upload do logótipo da empresa.
// É uma cópia adaptada do uploadMiddleware.js original.

const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Módulo 'fs' para verificar/criar diretórios

// Define a pasta onde os logos serão guardados
const logoUploadPath = 'public/uploads/logos/';

// Verifica se a pasta existe, senão cria-a
if (!fs.existsSync(logoUploadPath)) {
    try {
        fs.mkdirSync(logoUploadPath, { recursive: true });
        console.log(`[MW-UploadLogo] Diretório criado: ${logoUploadPath}`);
    } catch (err) {
        console.error(`[MW-UploadLogo] ERRO ao criar diretório ${logoUploadPath}:`, err);
        // Lança o erro para impedir que o Multer tente salvar num local inválido
        throw new Error(`Falha ao criar diretório de upload: ${logoUploadPath}`);
    }
}

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Garante que a pasta existe antes de cada upload (redundante, mas seguro)
    if (!fs.existsSync(logoUploadPath)) {
         return cb(new Error(`Diretório de destino não existe: ${logoUploadPath}`), null);
    }
    cb(null, logoUploadPath); // Usa a pasta definida
  },
  filename: (req, file, cb) => {
    // Para simplificar, o logo terá sempre o mesmo nome (ex: company_logo.png)
    // Se um novo for enviado, ele substituirá o antigo.
    const fileExtension = path.extname(file.originalname).toLowerCase(); // Garante minúsculas
    // Define um nome fixo para facilitar a referência
    cb(null, 'company_logo' + fileExtension); // Ex: company_logo.png ou company_logo.svg
  }
});

// Filtro para aceitar apenas determinados tipos de ficheiros de imagem
const fileFilter = (req, file, cb) => {
    // Tipos MIME permitidos
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    // Extensões permitidas (lowercase)
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg'];

    const fileExt = path.extname(file.originalname).toLowerCase();

    // Verifica tanto o mimetype quanto a extensão para maior segurança
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExt)) {
        console.log(`[MW-UploadLogo] Ficheiro permitido: ${file.originalname} (MIME: ${file.mimetype})`);
        cb(null, true); // Aceita o ficheiro
    } else {
        console.warn(`[MW-UploadLogo] Ficheiro REJEITADO: ${file.originalname} (MIME: ${file.mimetype}, Ext: ${fileExt})`);
        // Rejeita o ficheiro com uma mensagem de erro clara
        cb(new Error('Tipo de ficheiro inválido. Apenas imagens (jpg, png, gif, svg) são permitidas.'), false);
    }
};


// Configuração final do Multer
const uploadLogo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    // Limite de tamanho do ficheiro (ex: 5MB)
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  }
});

// Middleware final que será usado na rota
// Ele tenta processar um único ficheiro do campo 'companyLogo'
const logoUploadMiddleware = (req, res, next) => {
    // Chama o 'single' do multer com tratamento de erro específico
    const upload = uploadLogo.single('companyLogo'); // Espera um campo chamado 'companyLogo'

    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Um erro do Multer ocorreu (ex: limite de tamanho excedido)
            console.error('[MW-UploadLogo] Erro do Multer:', err);
             if (err.code === 'LIMIT_FILE_SIZE') {
                 return res.status(400).json({ message: 'Erro no upload: Ficheiro demasiado grande (Máx 5MB).' });
             }
             return res.status(400).json({ message: `Erro no upload: ${err.message}` });
        } else if (err) {
            // Um erro inesperado (ex: erro do fileFilter, erro de permissão de escrita)
            console.error('[MW-UploadLogo] Erro inesperado no upload:', err);
             // Se for o erro do nosso fileFilter
             if (err.message.includes('Tipo de ficheiro inválido')) {
                  return res.status(400).json({ message: err.message });
             }
            return res.status(500).json({ message: 'Erro interno no servidor durante o upload do ficheiro.' });
        }
        // Se tudo correu bem, o ficheiro (ou a ausência dele) está em req.file
        console.log('[MW-UploadLogo] Upload processado (ou nenhum ficheiro enviado). req.file:', req.file ? req.file.filename : 'Nenhum');
        next(); // Passa para o próximo middleware ou para o controller
    });
};


module.exports = logoUploadMiddleware; // Exporta a função middleware completa

