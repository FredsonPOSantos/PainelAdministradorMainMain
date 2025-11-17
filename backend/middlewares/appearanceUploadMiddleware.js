// Ficheiro: middlewares/appearanceUploadMiddleware.js
// Descrição: Middleware para upload de assets da página de configurações de aparência.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define os diretórios de upload
const UPLOAD_DIRS = {
    logos: path.join(__dirname, '../../public/uploads/logos'),
    background: path.join(__dirname, '../../public/uploads/background')
};

// Garante que os diretórios de upload existam
Object.values(UPLOAD_DIRS).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configuração de armazenamento do Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Decide a pasta de destino com base no nome do campo do formulário
        if (file.fieldname === 'companyLogo' || file.fieldname === 'loginLogo') {
            cb(null, UPLOAD_DIRS.logos);
        } else if (file.fieldname === 'backgroundImage') {
            cb(null, UPLOAD_DIRS.background);
        } else {
            cb(new Error('Campo de ficheiro inválido!'), null);
        }
    },
    filename: (req, file, cb) => {
        // Define nomes de ficheiro fixos para facilitar a referência
        const fileExtension = path.extname(file.originalname).toLowerCase();
        let finalName = file.fieldname; // ex: 'companyLogo'

        if (file.fieldname === 'companyLogo') finalName = 'company_logo';
        if (file.fieldname === 'loginLogo') finalName = 'login_logo';
        if (file.fieldname === 'backgroundImage') finalName = 'background';

        cb(null, finalName + fileExtension);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

module.exports = upload.fields([
    { name: 'companyLogo', maxCount: 1 },
    { name: 'loginLogo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]);