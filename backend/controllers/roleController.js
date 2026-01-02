// Ficheiro: backend/controllers/roleController.js
const { pool } = require('../connection');
const { logAction } = require('../services/auditLogService');

// Listar todos os perfis
const getRoles = async (req, res) => {
    try {
        const result = await pool.query('SELECT slug, name, description, is_system FROM roles ORDER BY name ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erro ao listar perfis:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar perfis.' });
    }
};

// Criar novo perfil (Futuro)
const createRole = async (req, res) => {
    const { slug, name, description } = req.body;
    // Validação básica
    if (!slug || !name) return res.status(400).json({ success: false, message: 'Slug e Nome são obrigatórios.' });

    try {
        await pool.query(
            'INSERT INTO roles (slug, name, description, is_system) VALUES ($1, $2, $3, false)',
            [slug.toLowerCase(), name, description]
        );
        
        await logAction({
            req,
            action: 'ROLE_CREATE',
            status: 'SUCCESS',
            description: `Criado novo perfil de acesso: ${name} (${slug})`,
            target_type: 'role',
            target_id: slug
        });

        res.json({ success: true, message: 'Perfil criado com sucesso.' });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({ success: false, message: 'Já existe um perfil com este identificador (slug).' });
        }
        console.error('Erro ao criar perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao criar perfil.' });
    }
};

// [NOVO] Eliminar perfil
const deleteRole = async (req, res) => {
    const { slug } = req.params;

    try {
        // Verifica se é um perfil de sistema
        const roleCheck = await pool.query('SELECT is_system, name FROM roles WHERE slug = $1', [slug]);
        if (roleCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Perfil não encontrado.' });
        }
        if (roleCheck.rows[0].is_system) {
            return res.status(403).json({ success: false, message: 'Não é permitido excluir perfis padrão do sistema.' });
        }

        // [NOVO] Verifica se existem utilizadores associados a este perfil antes de excluir
        const userCountResult = await pool.query('SELECT COUNT(*) FROM admin_users WHERE role = $1', [slug]);
        const userCount = parseInt(userCountResult.rows[0].count, 10);

        if (userCount > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `Não é possível excluir este perfil pois ele está atribuído a ${userCount} utilizador(es). Por favor, reatribua esses utilizadores a outro perfil antes de excluir.` 
            });
        }

        // Remove o perfil (as permissões em role_permissions devem ser removidas via CASCADE se configurado no DB, 
        // mas por segurança podemos remover manualmente ou confiar na constraint)
        // Vamos assumir que precisamos limpar referências manuais se não houver CASCADE
        await pool.query('DELETE FROM role_permissions WHERE role_name = $1', [slug]);
        await pool.query('DELETE FROM roles WHERE slug = $1', [slug]);

        await logAction({
            req,
            action: 'ROLE_DELETE',
            status: 'SUCCESS',
            description: `Perfil de acesso "${roleCheck.rows[0].name}" (${slug}) excluído.`,
            target_type: 'role',
            target_id: slug
        });

        res.json({ success: true, message: 'Perfil excluído com sucesso.' });
    } catch (error) {
        console.error('Erro ao excluir perfil:', error);
        res.status(500).json({ success: false, message: 'Erro ao excluir perfil. Verifique se há usuários vinculados.' });
    }
};

module.exports = { getRoles, createRole, deleteRole };
