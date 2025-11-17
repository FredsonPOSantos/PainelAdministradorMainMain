// Ficheiro: PainelAdministradorMain-master\backend\middlewares\uploadMiddlewareHotspot.js
// Descrição: Middleware para upload de assets (logo e fundo) para os templates do Hotspot.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define os diretórios de upload específicos para o hotspot
const UPLOAD_DIRS = {
    background: path.join(__dirname, '../../public/uploads/Background_hotspot'),
    logo: path.join(__dirname, '../../public/uploads/logo_hotspot')
};

// Garante que os diretórios de upload existam no momento da inicialização
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Decide a pasta de destino com base no nome do campo do formulário
        if (file.fieldname === 'backgroundFile') {
            cb(null, UPLOAD_DIRS.background);
        } else if (file.fieldname === 'logoFile' || file.fieldname === 'statusLogoFile') {
            cb(null, UPLOAD_DIRS.logo);
        } else {
            // Se um campo inesperado for enviado, rejeita com um erro
            cb(new Error('Campo de arquivo inválido!'), null);
        }
    },
    filename: (req, file, cb) => {
        // Cria um nome de arquivo único para evitar conflitos e garantir que não haja sobreposição
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `hotspot-${file.fieldname}-${uniqueSuffix}${extension}`);
    }
});

// Filtro para aceitar apenas arquivos de imagem
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true); // Aceita o arquivo
    } else {
        cb(new Error('Apenas arquivos de imagem são permitidos!'), false); // Rejeita o arquivo
    }
};

// Cria a instância do multer com as configurações
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por arquivo
});

// Exporta o middleware configurado para lidar com múltiplos campos.
// Ele vai procurar por arquivos nos campos 'backgroundFile' e 'logoFile' do formulário.
module.exports = upload.fields([
    { name: 'backgroundFile', maxCount: 1 },
    { name: 'logoFile', maxCount: 1 },
    { name: 'statusLogoFile', maxCount: 1 } // [NOVO]
]);