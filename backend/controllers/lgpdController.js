// Ficheiro: backend/controllers/lgpdController.js
// Descrição: Lida com a lógica para a gestão de pedidos de exclusão de dados (LGPD).

const pool = require('../connection');
const { logAction } = require('../services/auditLogService');

// Função para um utilizador do hotspot solicitar a exclusão dos seus dados
const requestExclusion = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'O e-mail é obrigatório para solicitar a exclusão.' });
    }

    try {
        // Verifica se já existe um pedido pendente para este e-mail para evitar duplicados
        const existingRequest = await pool.query(
            'SELECT id FROM data_exclusion_requests WHERE user_email = $1 AND status = $2',
            [email, 'pending']
        );

        if (existingRequest.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Já existe um pedido de exclusão pendente para este e-mail.' });
        }

        // Insere o novo pedido na base de dados
        const newRequest = await pool.query(
            'INSERT INTO data_exclusion_requests (user_email) VALUES ($1) RETURNING id, request_date',
            [email]
        );

        // [TODO - Fase 4.1] Idealmente, aqui seria gerado um alerta para os administradores

        res.status(201).json({
            success: true,
            message: 'O seu pedido de exclusão de dados foi registado com sucesso. Iremos processá-lo em breve.',
            requestId: newRequest.rows[0].id
        });

    } catch (error) {
        console.error('Erro ao criar pedido de exclusão de dados:', error);
        res.status(500).json({ success: false, message: 'Ocorreu um erro interno. Por favor, tente novamente mais tarde.' });
    }
};

// Função para administradores (Master/DPO) verem todos os pedidos de exclusão
const getExclusionRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id,
                r.user_email,
                r.request_date,
                r.status,
                r.completion_date,
                u.nome_completo as completed_by
            FROM data_exclusion_requests r
            LEFT JOIN admin_users u ON r.completed_by_user_id = u.id
            ORDER BY r.request_date DESC
        `;

        const { rows } = await pool.query(query);
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error('Erro ao buscar pedidos de exclusão:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar os pedidos.' });
    }
};

// Função para um administrador marcar um pedido como concluído
const completeExclusionRequest = async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.user.userId;

    try {
        const result = await pool.query(
            'UPDATE data_exclusion_requests SET status = $1, completed_by_user_id = $2, completion_date = NOW() WHERE id = $3 AND status = $4 RETURNING user_email',
            ['completed', adminUserId, id, 'pending']
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado ou já foi concluído.' });
        }

        const userEmail = result.rows[0].user_email;

        // Log de auditoria
        await logAction({
            req,
            action: 'LGPD_REQUEST_COMPLETE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" marcou o pedido de exclusão de dados para o e-mail "${userEmail}" (ID: ${id}) como concluído.`,
            target_type: 'lgpd_request',
            target_id: id
        });

        res.json({ success: true, message: `Pedido de exclusão para ${userEmail} marcado como concluído.` });

    } catch (error) {
        console.error('Erro ao concluir pedido de exclusão:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao processar o pedido.' });
    }
};

const searchUsers = async (req, res) => {
    const { searchTerm, searchType } = req.query;

    if (!searchTerm) {
        return res.json({ success: true, data: [] });
    }

    try {
        let query = 'SELECT id, username, nome_completo, telefone, mac_address FROM userdetails';
        const params = [`%${searchTerm}%`];

        switch (searchType) {
            case 'nome':
                query += ' WHERE nome_completo ILIKE $1';
                break;
            case 'email':
                query += ' WHERE username ILIKE $1';
                break;
            case 'telefone':
                query += ' WHERE telefone ILIKE $1';
                break;
            default:
                query += ' WHERE nome_completo ILIKE $1 OR username ILIKE $1 OR telefone ILIKE $1';
                break;
        }

        query += ' ORDER BY nome_completo ASC';

        const { rows } = await pool.query(query, params);
        res.json({ success: true, data: rows });

    } catch (error) {
        console.error('Erro ao pesquisar utilizadores do hotspot:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao pesquisar utilizadores.' });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM userdetails WHERE id = $1 RETURNING username', [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });
        }

        const userEmail = result.rows[0].username;

        await logAction({
            req,
            action: 'LGPD_USER_DELETE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" eliminou o utilizador do hotspot com e-mail "${userEmail}" (ID: ${id}) por motivos de LGPD.`,
            target_type: 'hotspot_user',
            target_id: id
        });

        res.json({ success: true, message: `Utilizador ${userEmail} eliminado com sucesso.` });

    } catch (error) {
        console.error('Erro ao eliminar utilizador do hotspot:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao eliminar o utilizador.' });
    }
};

module.exports = {
    requestExclusion,
    getExclusionRequests,
    completeExclusionRequest,
    searchUsers,
    deleteUser
};
