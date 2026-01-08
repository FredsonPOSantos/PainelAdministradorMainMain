// Ficheiro: backend/controllers/ticketController.js
// Descrição: Contém a lógica de negócio para o sistema de tickets.

const { pool } = require('../connection');
const { logAction } = require('../services/auditLogService');
const { sendEmail } = require('../emailService');
const aiService = require('../services/aiService'); // [NOVO] Importa o serviço de IA

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
    const { title, message, assigned_to_user_id } = req.body;
    const { userId, role, email } = req.user;

    if (!title || !message) {
        return res.status(400).json({ success: false, message: 'Título e mensagem são obrigatórios.' });
    }

    // Se um ID de atribuição for fornecido, verifique se o utilizador tem permissão para atribuir
    if (assigned_to_user_id && !['master', 'gestao', 'DPO'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Você não tem permissão para criar um ticket atribuído a outro utilizador.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const sequenceResult = await client.query("SELECT nextval('tickets_id_seq') as id");
        const ticketId = sequenceResult.rows[0].id;
        const ticketNumber = generateTicketNumber(ticketId);

        // Insere o ticket, incluindo o assigned_to_user_id se fornecido
        await client.query(
            'INSERT INTO tickets (id, ticket_number, title, created_by_user_id, assigned_to_user_id) VALUES ($1, $2, $3, $4, $5)',
            [ticketId, ticketNumber, title, userId, assigned_to_user_id || null]
        );

        await client.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3)',
            [ticketId, userId, message]
        );

        // Lógica de notificação
        const notificationMessage = `Novo ticket #${ticketNumber} criado por ${email}`;
        const notificationRecipients = new Set();

        // Se o ticket for atribuído na criação, notifique o atribuído
        if (assigned_to_user_id) {
            notificationRecipients.add(assigned_to_user_id);
        }

        // Notificar todos os MASTER, Gestão e DPO, exceto quem criou
        const adminUsers = await client.query("SELECT id, role FROM admin_users WHERE role IN ('master', 'gestao', 'DPO')");
        adminUsers.rows.forEach(user => {
            if (user.id !== userId) {
                notificationRecipients.add(user.id);
            }
        });

        for (const recipientId of notificationRecipients) {
            await client.query(
                'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
                [recipientId, 'new_ticket', ticketId, notificationMessage]
            );

            // Enviar email
            const creatorName = email;

            const recipient = await client.query('SELECT email FROM admin_users WHERE id = $1', [recipientId]);
            if (recipient.rows.length > 0) {
                const recipientEmail = recipient.rows[0].email;
                const emailSubject = `Novo Ticket Criado: #${ticketNumber}`;
                const emailText = `Olá,\n\nUm novo ticket foi criado por ${creatorName}: #${ticketNumber}\n\nTítulo: ${title}\n\nPara ver o ticket, acesse o painel de administração.\n\nAtenciosamente,\nEquipe de Suporte`;
                await sendEmail(recipientEmail, emailSubject, emailText);
            }
        }

        await client.query('COMMIT');

        logAction({
            req,
            action: 'TICKET_CREATE',
            status: 'SUCCESS',
            description: `Ticket #${ticketNumber} criado por ${email}`,
            target_id: ticketId,
            target_type: 'ticket'
        });

        // [NOVO] Após criar o ticket, tenta gerar uma resposta automática com a IA
        // Esta parte é "fire-and-forget" para não atrasar a resposta ao utilizador.
        (async () => {
            try {
                const aiResponse = await aiService.generateInitialResponse(title, message);
                if (aiResponse) {
                    // [ATUALIZADO] Insere a resposta da IA como uma nova mensagem com user_id NULO (Assistente Virtual)
                    await pool.query(
                        'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3)',
                        [ticketId, null, aiResponse]
                    );
                }
            } catch (aiError) {
                console.error(`[AI-RESPONSE-ERROR] Falha ao adicionar resposta da IA para o ticket ${ticketId}:`, aiError);
            }
        })();

        res.status(201).json({ success: true, message: 'Ticket criado com sucesso!', data: { ticketId, ticketNumber } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar ticket:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// [NOVO] Criar um ticket público (sem autenticação)
const createPublicTicket = async (req, res) => {
    const { name, email, phone, sector, location, title, message } = req.body;

    if (!name || !email || !title || !message) {
        return res.status(400).json({ success: false, message: 'Nome, e-mail, assunto e mensagem são obrigatórios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const sequenceResult = await client.query("SELECT nextval('tickets_id_seq') as id");
        const ticketId = sequenceResult.rows[0].id;
        const ticketNumber = generateTicketNumber(ticketId);

        // Insere o ticket com dados do convidado e created_by_user_id NULL
        await client.query(
            `INSERT INTO tickets (
                id, ticket_number, title, created_by_user_id, 
                guest_name, guest_email, guest_phone, guest_department, guest_location
            ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8)`,
            [ticketId, ticketNumber, title, name, email, phone, sector, location]
        );

        // Insere a primeira mensagem (user_id NULL indica sistema/externo)
        await client.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, NULL, $2)',
            [ticketId, message]
        );

        // Notificações
        const notificationMessage = `Novo ticket público #${ticketNumber} de ${name} (${email})`;
        
        // Notificar admins (Master e Gestão)
        const adminUsers = await client.query("SELECT id, email FROM admin_users WHERE role IN ('master', 'gestao')");
        
        for (const admin of adminUsers.rows) {
            await client.query(
                'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
                [admin.id, 'new_ticket', ticketId, notificationMessage]
            );

            // Enviar email para admin
            const emailSubject = `Novo Ticket Público: #${ticketNumber}`;
            const emailText = `Novo ticket aberto via portal público.\n\nSolicitante: ${name} (${email})\nAssunto: ${title}\n\nMensagem:\n${message}`;
            await sendEmail(admin.email, emailSubject, emailText);
        }

        // Enviar email de confirmação para o utilizador (convidado)
        const userSubject = `Ticket Recebido: #${ticketNumber}`;
        const userText = `Olá ${name},\n\nRecebemos o seu pedido de suporte.\nNúmero do Ticket: #${ticketNumber}\nAssunto: ${title}\n\nA nossa equipa irá analisar e entrar em contacto em breve através deste e-mail.\n\nAtenciosamente,\nRota Hotspot`;
        await sendEmail(email, userSubject, userText);

        await client.query('COMMIT');

        // Log de auditoria (sem user_id, mas com user_email do convidado)
        logAction({
            req,
            action: 'TICKET_CREATE_PUBLIC',
            status: 'SUCCESS',
            description: `Ticket público #${ticketNumber} criado por ${email}`,
            target_id: ticketId,
            target_type: 'ticket',
            user_email: email // Força o email no log
        });

        // IA Response (Opcional)
        (async () => {
            try {
                const aiResponse = await aiService.generateInitialResponse(title, message);
                if (aiResponse) {
                    await pool.query(
                        'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, NULL, $2)',
                        [ticketId, null, aiResponse]
                    );
                }
            } catch (aiError) {
                if (aiError.message && aiError.message.includes('leaked')) {
                    console.error(`[AI-RESPONSE-ERROR] 🚨 A chave de API do Gemini foi bloqueada.`);
                } else {
                    console.error(`[AI-RESPONSE-ERROR] Falha ao adicionar resposta da IA para o ticket ${ticketId}:`, aiError);
                }
            }
        })();

        res.status(201).json({ success: true, message: 'Ticket criado com sucesso!', data: { ticketNumber } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar ticket público:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// Obter todos os tickets
const getAllTickets = async (req, res) => {
    const { userId, role } = req.user;
    const { status, search, page = 1, limit = 10 } = req.query;

    try {
        const params = [];
        const whereClauses = [];

        if (!['master', 'gestao'].includes(role)) {
            // [MODIFICADO] Permite que o utilizador veja tickets que criou, que lhe foram atribuídos, OU onde foi mencionado.
            const userSpecificClause = `
                (t.created_by_user_id = $${params.length + 1} 
                 OR t.assigned_to_user_id = $${params.length + 1}
                 OR t.id IN (SELECT related_ticket_id FROM notifications WHERE user_id = $${params.length + 1} AND type = 'mention'))
            `;
            params.push(userId);
            whereClauses.push(userSpecificClause);
        }

        if (status) {
            whereClauses.push(`t.status = $${params.length + 1}`);
            params.push(status);
        }

        if (search) {
            whereClauses.push(`(t.title ILIKE $${params.length + 1} OR t.ticket_number ILIKE $${params.length + 1})`);
            params.push(`%${search}%`);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query para obter os tickets da página atual
        let query = `
            SELECT 
                t.id, t.ticket_number, t.title, t.status, t.created_at, t.updated_at,
                u_creator.email AS created_by_email,
                u_assignee.email AS assigned_to_email,
                (SELECT r.rating FROM ticket_ratings r WHERE r.ticket_id = t.id) AS rating
            FROM tickets t
            JOIN admin_users u_creator ON t.created_by_user_id = u_creator.id
            LEFT JOIN admin_users u_assignee ON t.assigned_to_user_id = u_assignee.id
            ${whereString}
            ORDER BY t.updated_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        const offset = (page - 1) * limit;
        const pageParams = [...params, limit, offset];
        
        const result = await pool.query(query, pageParams);

        // Query para obter a contagem total de tickets com os mesmos filtros
        const countQuery = `SELECT COUNT(t.id) FROM tickets t ${whereString}`;
        const countResult = await pool.query(countQuery, params);
        const totalTickets = parseInt(countResult.rows[0].count, 10);

        res.json({ 
            success: true, 
            data: {
                tickets: result.rows,
                totalTickets,
                totalPages: Math.ceil(totalTickets / limit),
                currentPage: parseInt(page, 10)
            }
        });

    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Obter um único ticket com as suas mensagens
const getTicketById = async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    try {
        const ticketResult = await pool.query(`
            SELECT 
                t.id, t.ticket_number, t.title, t.status, t.created_at, t.updated_at,
                t.created_by_user_id,
                t.assigned_to_user_id,
                u_creator.email AS created_by_email,
                u_assignee.email AS assigned_to_email,
                (SELECT r.rating FROM ticket_ratings r WHERE r.ticket_id = t.id) AS rating,
                (SELECT r.comment FROM ticket_ratings r WHERE r.ticket_id = t.id) AS rating_comment
            FROM tickets t
            JOIN admin_users u_creator ON t.created_by_user_id = u_creator.id
            LEFT JOIN admin_users u_assignee ON t.assigned_to_user_id = u_assignee.id
            WHERE t.id = $1
        `, [id]);

        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        const ticket = ticketResult.rows[0];

        // Validação de permissão:
        // 1. Admin (master, gestao, DPO)
        // 2. Criador do ticket
        // 3. Atribuído ao ticket
        // 4. Mencionado no ticket (verifica se existe notificação de menção para este utilizador neste ticket)
        const isMentioned = await pool.query(
            "SELECT 1 FROM notifications WHERE user_id = $1 AND related_ticket_id = $2 AND type = 'mention'",
            [userId, id]
        );

        if (!['master', 'gestao', 'DPO'].includes(role) && ticket.created_by_user_id !== userId && ticket.assigned_to_user_id !== userId && isMentioned.rowCount === 0) {
            return res.status(403).json({ success: false, message: 'Você não tem permissão para ver este ticket.' });
        }

        const messagesResult = await pool.query(`
            SELECT m.id, m.message, m.created_at, m.user_id, u.email AS user_email, u.avatar_url
            FROM ticket_messages m
            LEFT JOIN admin_users u ON m.user_id = u.id
            WHERE m.ticket_id = $1
            ORDER BY m.created_at ASC
        `, [id]);

        const response = {
            ...ticket,
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
    const { userId, email } = req.user;

    if (!message) {
        return res.status(400).json({ success: false, message: 'A mensagem é obrigatória.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3) RETURNING id',
            [id, userId, message]
        );

        await client.query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [id]);

        // Lógica de notificação para novas mensagens
        const ticketInfo = await client.query('SELECT created_by_user_id, assigned_to_user_id, ticket_number FROM tickets WHERE id = $1', [id]);
        const { created_by_user_id, assigned_to_user_id, ticket_number } = ticketInfo.rows[0];

        const creatorInfo = await client.query('SELECT role FROM admin_users WHERE id = $1', [created_by_user_id]);
        const creatorRole = creatorInfo.rows[0].role;

        const recipients = new Set();
        const emailRecipients = new Set(); // Para controlar quem recebe e-mail

        // 1. Notificar o criador do ticket, se não for ele mesmo a responder
        if (created_by_user_id !== userId) {
            recipients.add(created_by_user_id);
            emailRecipients.add(created_by_user_id);
        }
        
        // 2. Notificar o utilizador atribuído, se houver e não for ele mesmo a responder
        if (assigned_to_user_id && assigned_to_user_id !== userId) {
            recipients.add(assigned_to_user_id);
            emailRecipients.add(assigned_to_user_id);
        }

        // 3. Se quem criou for 'estetica', notificar todos os 'master', 'gestao', 'DPO'
        if (creatorRole === 'estetica') {
            const adminUsers = await client.query("SELECT id FROM admin_users WHERE role IN ('master', 'gestao', 'DPO')");
            adminUsers.rows.forEach(user => {
                if (user.id !== userId) { // Não notificar quem está a responder
                    recipients.add(user.id);
                }
            });
        }
        
        // 4. Notificar utilizadores mencionados anteriormente neste ticket
        const mentionedUsers = await client.query(
            "SELECT DISTINCT user_id FROM notifications WHERE related_ticket_id = $1 AND type = 'mention'",
            [id]
        );
        mentionedUsers.rows.forEach(row => {
            if (row.user_id !== userId) {
                recipients.add(row.user_id);
                emailRecipients.add(row.user_id);
            }
        });

        // 5. Garantir que Master recebe notificação (se não for quem respondeu)
        const masters = await client.query("SELECT id FROM admin_users WHERE role = 'master'");
        masters.rows.forEach(m => {
            if (m.id !== userId) recipients.add(m.id);
        });

        const notificationMessage = `Nova resposta no ticket #${ticket_number} de ${email}`;
        for (const recipientId of recipients) {
            await client.query(
                'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
                [recipientId, 'new_message', id, notificationMessage]
            );

            // Enviar email
            if (emailRecipients.has(recipientId)) {
                const senderName = email;
                const recipient = await client.query('SELECT email FROM admin_users WHERE id = $1', [recipientId]);
                if (recipient.rows.length > 0) {
                    const recipientEmail = recipient.rows[0].email;
                    const emailSubject = `Nova Mensagem no Ticket: #${ticket_number}`;
                    const emailText = `Olá,\n\nUma nova mensagem foi adicionada ao ticket #${ticket_number} por ${senderName}.\n\nMensagem: ${message}\n\nPara ver o ticket, acesse o painel de administração.\n\nAtenciosamente,\nEquipe de Suporte`;
                    await sendEmail(recipientEmail, emailSubject, emailText);
                }
            }
        }

        await client.query('COMMIT');

        // [NOVO] Lógica de IA Autônoma: Se quem respondeu foi o criador do ticket (usuário), aciona a IA
        // Fazemos isso fora da transação principal para não bloquear a resposta ao usuário
        (async () => {
            try {
                const ticketCheck = await pool.query('SELECT created_by_user_id, status, title FROM tickets WHERE id = $1', [id]);
                const currentTicket = ticketCheck.rows[0];

                // Se o autor da mensagem é o dono do ticket e o ticket não está fechado
                if (currentTicket && currentTicket.created_by_user_id === userId && currentTicket.status !== 'closed') {
                    // Busca histórico completo para contexto
                    const historyResult = await pool.query(
                        'SELECT user_id, message FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
                        [id]
                    );
                    
                    const aiResponse = await aiService.generateChatResponse(currentTicket.title, historyResult.rows);
                    
                    if (aiResponse) {
                        await pool.query('INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3)', [id, null, aiResponse]);
                    }
                }
            } catch (aiError) {
                console.error(`[AI-CHAT-ERROR] Falha na resposta da IA para ticket ${id}:`, aiError);
            }
        })();

        logAction({
            req,
            action: 'TICKET_REPLY',
            status: 'SUCCESS',
            description: `${email} respondeu ao ticket ID ${id}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.status(201).json({ success: true, message: 'Mensagem adicionada com sucesso!' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Erro ao adicionar mensagem ao ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// Atribuir/Encaminhar um ticket
const assignTicket = async (req, res) => {
    const { id } = req.params;
    const { assignee_id } = req.body;
    const { role, email } = req.user;

    if (!['master', 'gestao'].includes(role)) {
        return res.status(403).json({ success: false, message: 'Você não tem permissão para encaminhar tickets.' });
    }

    if (!assignee_id) {
        return res.status(400).json({ success: false, message: 'O ID do utilizador para encaminhamento é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE tickets SET assigned_to_user_id = $1, updated_at = NOW() WHERE id = $2 RETURNING ticket_number',
            [assignee_id, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        const notificationMessage = `O ticket #${result.rows[0].ticket_number} foi encaminhado para você por ${email}`;
        await pool.query(
            'INSERT INTO notifications (user_id, type, related_ticket_id, message) VALUES ($1, $2, $3, $4)',
            [assignee_id, 'ticket_assigned', id, notificationMessage]
        );

        logAction({
            req,
            action: 'TICKET_ASSIGN',
            status: 'SUCCESS',
            description: `${email} encaminhou o ticket ID ${id} para o utilizador ID ${assignee_id}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.json({ success: true, message: 'Ticket encaminhado com sucesso!' });

    } catch (error) {
        console.error(`Erro ao encaminhar ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Mudar o status de um ticket
const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role, email } = req.user;

    if (!status) {
        return res.status(400).json({ success: false, message: 'O novo status é obrigatório.' });
    }

    try {
        const ticketResult = await pool.query('SELECT created_by_user_id FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }
        const ticket = ticketResult.rows[0];

        // Regra para 'estetica': só pode fechar o próprio ticket
        if (role === 'estetica') {
            if (ticket.created_by_user_id !== userId) {
                return res.status(403).json({ success: false, message: 'Você não pode alterar o status de um ticket que não criou.' });
            }
            if (status !== 'closed') {
                return res.status(403).json({ success: false, message: 'Você só pode fechar o seu próprio ticket.' });
            }
        }

        const result = await pool.query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, ticket_number, title',
            [status, id]
        );

        if (status === 'closed') {
            const { ticket_number, title } = result.rows[0];
            const creatorId = ticket.created_by_user_id;
            const creator = await pool.query('SELECT email FROM admin_users WHERE id = $1', [creatorId]);

            if (creator.rows.length > 0) {
                const creatorEmail = creator.rows[0].email;
                const emailSubject = `Ticket Fechado: #${ticket_number}`;
                const emailText = `Olá,\n\nO seu ticket #${ticket_number} - \"${title}\" foi fechado.\n\nObrigado por usar o nosso sistema de suporte.\n\nAtenciosamente,\nEquipe de Suporte`;
                await sendEmail(creatorEmail, emailSubject, emailText);
            }
        }

        logAction({
            req,
            action: 'TICKET_STATUS_UPDATE',
            status: 'SUCCESS',
            description: `${email} alterou o status do ticket ID ${id} para ${status}`,
            target_id: id,
            target_type: 'ticket'
        });

        res.json({ success: true, message: `Status do ticket alterado para ${status}!` });

    } catch (error) {
        console.error(`Erro ao alterar status do ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Avaliar um ticket
const addTicketRating = async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const { userId, role } = req.user;

    if (role !== 'estetica') {
        return res.status(403).json({ success: false, message: 'Apenas o criador do ticket pode avaliá-lo.' });
    }

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'A avaliação deve ser um número entre 1 e 5.' });
    }

    try {
        const ticketResult = await pool.query('SELECT created_by_user_id, status FROM tickets WHERE id = $1', [id]);
        if (ticketResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Ticket não encontrado.' });
        }

        const ticket = ticketResult.rows[0];

        if (ticket.created_by_user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Você só pode avaliar tickets que você criou.' });
        }

        if (ticket.status !== 'closed') {
            return res.status(400).json({ success: false, message: 'Só é possível avaliar tickets fechados.' });
        }

        // Verifica se já existe uma avaliação
        const existingRating = await pool.query('SELECT id FROM ticket_ratings WHERE ticket_id = $1', [id]);
        if (existingRating.rowCount > 0) {
            return res.status(400).json({ success: false, message: 'Este ticket já foi avaliado.' });
        }

        await pool.query(
            'INSERT INTO ticket_ratings (ticket_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)',
            [id, userId, rating, comment]
        );

        res.status(201).json({ success: true, message: 'Obrigado pela sua avaliação!' });

    } catch (error) {
        console.error(`Erro ao avaliar o ticket ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

const uploadAttachment = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum ficheiro enviado.' });
    }

    // Constrói a URL completa do ficheiro
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/ticket_attachments/${req.file.filename}`;

    res.json({ success: true, url: fileUrl });
};


module.exports = {
    createTicket,
    createPublicTicket, // [NOVO]
    getAllTickets,
    getTicketById,
    addMessageToTicket,
    assignTicket,
    updateTicketStatus,
    addTicketRating,
    uploadAttachment
};