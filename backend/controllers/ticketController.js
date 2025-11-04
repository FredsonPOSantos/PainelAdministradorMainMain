// Ficheiro: backend/controllers/ticketController.js
// Descrição: Contém a lógica de negócio para o sistema de tickets.

const pool = require('../connection');
const { logAction } = require('../services/auditLogService');

// Função para gerar o número do ticket no formato DDMMAAAAHHMM-ID
const generateTicketNumber = (ticketId) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}${month}${year}${hours}${minutes}-${ticketId}`;
};

// Criar um novo ticket
const createTicket = async (req, res) => {
    const { title, message } = req.body;
    const created_by_user_id = req.user.userId;

    if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Título e mensagem são obrigatórios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Pega o próximo ID da sequência para gerar o número do ticket ANTES de inserir
        const sequenceResult = await client.query("SELECT nextval('tickets_id_seq') as id");
        const ticketId = sequenceResult.rows[0].id;
        const ticketNumber = generateTicketNumber(ticketId);

        // 2. Insere o ticket com todos os dados de uma vez
        await client.query(
            'INSERT INTO tickets (id, ticket_number, title, created_by_user_id) VALUES ($1, $2, $3, $4)',
            [ticketId, ticketNumber, title, created_by_user_id]
        );

        // 3. Insere a primeira mensagem
        await client.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3)',
            [ticketId, created_by_user_id, message]
        );

        // 4. [NOVO] Cria notificações para todos os utilizadores da função 'Gestão'
        const gestaoUsers = await client.query("SELECT id FROM admin_users WHERE role = 'gestao'");
        const notificationMessage = `Novo ticket #${ticketNumber} criado por ${req.user.email}`;
        for (const user of gestaoUsers.rows) {
            await client.query(
                'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
                [user.id, 'new_ticket', ticketId, notificationMessage]
            );
        }

        await client.query('COMMIT');

        logAction({
            req,
            action: 'TICKET_CREATE',
            status: 'SUCCESS',
            description: `Ticket #${ticketNumber} criado por ${req.user.email}`,
            target_id: ticketId,
            target_type: 'ticket'
        });

        res.status(201).json({ success: true, message: 'Ticket criado com sucesso!', data: { ticketId, ticketNumber } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar ticket:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// Obter todos os tickets (com filtros de visibilidade baseados na função)
const getAllTickets = async (req, res) => {
    const { userId, role } = req.user;

    try {
        let query = `
            SELECT 
                t.id, t.ticket_number, t.title, t.status, t.created_at, t.updated_at,
                u_creator.email AS created_by_email,
                u_assignee.email AS assigned_to_email
            FROM tickets t
            JOIN admin_users u_creator ON t.created_by_user_id = u_creator.id
            LEFT JOIN admin_users u_assignee ON t.assigned_to_user_id = u_assignee.id
        `;

        const params = [];

        // A função 'Gestão' vê todos os tickets. Outras funções veem apenas os seus ou os que lhes foram atribuídos.
        if (role !== 'Gestão') {
            query += ` WHERE t.created_by_user_id = $1 OR t.assigned_to_user_id = $1`;
            params.push(userId);
        }

        query += ' ORDER BY t.updated_at DESC';

        const result = await pool.query(query, params);

        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Obter um único ticket com as suas mensagens
const getTicketById = async (req, res) => {
    const { id } = req.params;

    try {
        // 1. Obter detalhes do ticket
        const ticketResult = await pool.query(`
            SELECT 
                t.id, t.ticket_number, t.title, t.status, t.created_at, t.updated_at,
                u_creator.email AS created_by_email,
                u_assignee.email AS assigned_to_email
            FROM tickets t
            JOIN admin_users u_creator ON t.created_by_user_id = u_creator.id
            LEFT JOIN admin_users u_assignee ON t.assigned_to_user_id = u_assignee.id
            WHERE t.id = $1
        `, [id]);

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        // 2. Obter mensagens do ticket
        const messagesResult = await pool.query(`
            SELECT m.id, m.message, m.created_at, u.email AS user_email
            FROM ticket_messages m
            JOIN admin_users u ON m.user_id = u.id
            WHERE m.ticket_id = $1
            ORDER BY m.created_at ASC
        `, [id]);

        const response = {
            ...ticketResult.rows[0],
            messages: messagesResult.rows
        };

        res.json({ success: true, data: response });

    } catch (error) {
        console.error(`Erro ao buscar ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Adicionar uma nova mensagem a um ticket
const addMessageToTicket = async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    const user_id = req.user.userId;

    if (!message) {
        return res.status(400).json({ success: false, message: 'A mensagem é obrigatória.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3) RETURNING id',
            [id, user_id, message]
        );

        // [NOVO] Atualiza o timestamp do ticket pai manualmente
        await pool.query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [id]);

        // [NOVO] Lógica de notificação para novas mensagens
        const ticketInfo = await pool.query('SELECT created_by_user_id, assigned_to_user_id, ticket_number FROM tickets WHERE id = $1', [id]);
        const { created_by_user_id, assigned_to_user_id, ticket_number } = ticketInfo.rows[0];

        const gestaoUsersResult = await pool.query("SELECT id FROM admin_users WHERE role = 'gestao'");
        const gestaoUserIds = gestaoUsersResult.rows.map(u => u.id);

        // Junta todos os IDs relevantes num Set para garantir que são únicos
        const recipients = new Set([created_by_user_id, ...gestaoUserIds]);
        if (assigned_to_user_id) {
            recipients.add(assigned_to_user_id);
        }

        // Remove o autor da mensagem da lista de notificados
        recipients.delete(user_id);

        // Cria as notificações
        const notificationMessage = `Nova resposta no ticket #${ticket_number}`;
        for (const recipientId of recipients) {
            await pool.query(
                'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
                [recipientId, 'new_message', id, notificationMessage]
            );
        }


        logAction({
            req,
            action: 'TICKET_REPLY',
            status: 'SUCCESS',
            description: `${req.user.email} respondeu ao ticket ID ${id}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.status(201).json({ success: true, message: 'Mensagem adicionada com sucesso!', data: { messageId: result.rows[0].id } });

    } catch (error) {
        console.error(`Erro ao adicionar mensagem ao ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Atribuir um ticket a um utilizador (apenas Master)
const assignTicket = async (req, res) => {
    const { id } = req.params;
    const { assignee_id } = req.body;

    if (req.user.role !== 'master') {
        return res.status(403).json({ success: false, message: 'Apenas administradores master podem atribuir tickets.' });
    }

    if (!assignee_id) {
        return res.status(400).json({ success: false, message: 'O ID do utilizador a atribuir é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE tickets SET assigned_to_user_id = $1, updated_at = NOW() WHERE id = $2 RETURNING ticket_number',
            [assignee_id, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        // [NOVO] Cria uma notificação para o utilizador que recebeu o ticket
        const notificationMessage = `Você foi atribuído ao ticket #${result.rows[0].ticket_number}`;
        await pool.query(
            'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
            [assignee_id, 'ticket_assigned', id, notificationMessage]
        );

        logAction({
            req,
            action: 'TICKET_ASSIGN',
            status: 'SUCCESS',
            description: `${req.user.email} atribuiu o ticket ID ${id} ao utilizador ID ${assignee_id}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.json({ success: true, message: 'Ticket atribuído com sucesso!' });

    } catch (error) {
        console.error(`Erro ao atribuir ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Mudar o status de um ticket
const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, message: 'O novo status é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        logAction({
            req,
            action: 'TICKET_STATUS_UPDATE',
            status: 'SUCCESS',
            description: `${req.user.email} alterou o status do ticket ID ${id} para ${status}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.json({ success: true, message: `Status do ticket alterado para ${status}!` });

    } catch (error) {
        console.error(`Erro ao alterar status do ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    addMessageToTicket,
    assignTicket,
    updateTicketStatus
};