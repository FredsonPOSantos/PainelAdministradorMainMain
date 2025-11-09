// Ficheiro: backend/middlewares/appearanceUploadMiddleware.js
// Descrição: Middleware para upload de imagens de aparência (logo de login e imagem de fundo).

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/';
        
        // Define o diretório correto baseado no campo do formulário
        switch(file.fieldname) {
            case 'companyLogo':
                uploadPath += 'logos/';
                break;
            case 'loginLogo':
                uploadPath += 'logos/';
                break;
            case 'backgroundImage':
                uploadPath += 'background/';
                break;
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Define nomes específicos para cada tipo de arquivo
        switch(file.fieldname) {
            case 'companyLogo':
                cb(null, 'company_logo' + path.extname(file.originalname));
                break;
            case 'loginLogo':
                cb(null, 'login_logo' + path.extname(file.originalname));
                break;
            case 'backgroundImage':
                cb(null, 'background' + path.extname(file.originalname));
                break;
            default:
                cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        }
    }
});

const fileFilter = (req, file, cb) => {
    // Aceita SVG e formatos de imagem comuns
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo não suportado. Use JPEG, PNG ou SVG.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limite
    }
});

module.exports = upload.fields([
    { name: 'companyLogo', maxCount: 1 },
    { name: 'loginLogo', maxCount: 1 },
    { name: 'backgroundImage', maxCount: 1 }
]);
