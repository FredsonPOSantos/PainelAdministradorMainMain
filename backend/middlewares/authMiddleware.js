// Ficheiro: middlewares/authMiddleware.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]
// Descrição: Middleware para verificar o token, buscar perfil e permissões do utilizador.

const jwt = require('jsonwebtoken');
const pool = require('../connection');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Um token é necessário para autenticação." });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ message: "Token inválido ou expirado." });
    }

    try {
        // 1. Buscar dados básicos do utilizador (incluindo a 'role')
        const userQuery = await pool.query(
            'SELECT id, email, role, is_active, must_change_password FROM admin_users WHERE id = $1',
            [decoded.userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ message: "Utilizador do token não encontrado." });
        }

        const user = userQuery.rows[0];

        // 2. Montar o objeto de permissões para o utilizador
        const permissions = {};
        if (user.role === 'master') {
            // Se for master, concede todas as permissões da tabela 'permissions'
            const allPermissionsResult = await pool.query('SELECT permission_key FROM permissions');
            allPermissionsResult.rows.forEach(p => {
                permissions[p.permission_key] = true;
            });
            // Em seguida, remove as permissões que o master não deve ter
            delete permissions['logs.read'];
            delete permissions['lgpd.read'];
            delete permissions['lgpd.update'];
        } else {
            // Para as outras funções, busca as permissões da tabela 'role_permissions'
            const permissionsResult = await pool.query(
                'SELECT permission_key FROM role_permissions WHERE role_name = $1',
                [user.role]
            );
            permissionsResult.rows.forEach(p => {
                permissions[p.permission_key] = true;
            });
        }

        // 4. Adicionar todos os dados ao objeto req.user
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            permissions: permissions // Objeto de permissões
        };

        // 5. Lógica de bloqueio para troca de senha obrigatória
        if (user.must_change_password) {
            const isGettingProfile = (req.path === '/profile' && req.method === 'GET');
            const isChangingPassword = (req.path === '/profile/change-own-password' && req.method === 'POST');

            if (!isGettingProfile && !isChangingPassword) {
                return res.status(403).json({ 
                    message: "Acesso negado. Troca de senha obrigatória pendente.",
                    code: "PASSWORD_CHANGE_REQUIRED"
                });
            }
        }

        return next();

    } catch (dbError) {
        console.error("Erro no authMiddleware ao buscar dados do utilizador:", dbError);
        return res.status(500).json({ message: "Erro interno ao verificar o estado do utilizador." });
    }
};

module.exports = verifyToken;

