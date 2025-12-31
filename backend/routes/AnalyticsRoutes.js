// Ficheiro: backend/routes/dashboardAnalyticsRoutes.js

const express = require('express');
const router = express.Router();
const { pool } = require('../connection'); // [CORRIGIDO] Aponta para o arquivo de conexão correto
const verifyToken = require('../middlewares/authMiddleware'); // [CORRIGIDO] Importa o middleware da forma correta
const checkPermission = require('../middlewares/roleMiddleware'); // [NOVO] Importa o middleware de permissão

/**
 * Middleware para garantir que apenas o 'master' pode aceder.
 * @deprecated Substituído por checkPermission('analytics.read') para ser gerenciável.
 */
const masterOnly = (req, res, next) => {
    if (req.user && req.user.role === 'master') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Acesso negado. Recurso disponível apenas para administradores Master.' });
};

/**
 * ROTA: GET /api/dashboard/analytics/logins
 * DESCRIÇÃO: Retorna dados detalhados sobre os logins para o dashboard analítico.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 * PARÂMETROS:
 *  - period (query): Número de dias a serem considerados (ex: 7, 15, 30). Padrão é 30.
 */
router.get('/logins', [verifyToken, checkPermission('analytics.details.logins')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // ---- Consulta para a Tabela de Últimos Acessos ----
        const latestLoginsQuery = `
            SELECT user_email, timestamp, status, ip_address
            FROM audit_logs
            WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE')
              AND timestamp >= NOW() - INTERVAL '${period} days'
            ORDER BY timestamp DESC
            LIMIT 100;
        `;

        // ---- Consulta para os Dados do Gráfico (Acessos por Dia) ----
        const loginsByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', timestamp), 'DD/MM') AS day,
                COUNT(*) AS count
            FROM audit_logs
            WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE')
              AND timestamp >= NOW() - INTERVAL '${period} days'
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY DATE_TRUNC('day', timestamp) ASC;
        `;

        // Executa as duas consultas em paralelo para maior eficiência
        const [latestLoginsResult, loginsByDayResult] = await Promise.all([
            pool.query(latestLoginsQuery),
            pool.query(loginsByDayQuery)
        ]);

        // Formata os dados para o gráfico
        const chartData = {
            labels: loginsByDayResult.rows.map(row => row.day),
            data: loginsByDayResult.rows.map(row => row.count)
        };

        // Monta a resposta final no formato esperado pelo frontend
        const responseData = {
            latest_logins: latestLoginsResult.rows,
            logins_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/hotspot-users (ATIVIDADE)
 * DESCRIÇÃO: Retorna dados detalhados sobre a ATIVIDADE (logins) dos utilizadores do hotspot.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 * PARÂMETROS:
 *  - period (query): Número de dias a serem considerados (ex: 7, 15, 30). Padrão é 30.
 */
router.get('/hotspot-users', [verifyToken, checkPermission('analytics.details.hotspot_users')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // [CORRIGIDO] Usa a coluna 'ultimo_login' da tabela 'userdetails' para medir a atividade.
        const latestUsersQuery = `
            SELECT
                username AS email,
                nome_completo AS fullname,
                accepts_marketing,
                ultimo_login AS created_at -- Reutilizando a coluna para 'última atividade'
            FROM userdetails
            WHERE ultimo_login >= NOW() - INTERVAL '${period} days'
            ORDER BY ultimo_login DESC
            LIMIT 100;
        `;

        // [CORRIGIDO] Conta utilizadores ATIVOS (distintos) por dia com base em 'ultimo_login'.
        const usersByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', ultimo_login), 'DD/MM') AS day,
                COUNT(DISTINCT username) AS count
            FROM userdetails
            WHERE ultimo_login >= NOW() - INTERVAL '${period} days'
            GROUP BY DATE_TRUNC('day', ultimo_login)
            ORDER BY DATE_TRUNC('day', ultimo_login) ASC;
        `;

        const [latestUsersResult, usersByDayResult] = await Promise.all([
            pool.query(latestUsersQuery),
            pool.query(usersByDayQuery)
        ]);

        const chartData = {
            labels: usersByDayResult.rows.map(row => row.day),
            data: usersByDayResult.rows.map(row => parseInt(row.count, 10))
        };

        const responseData = {
            latest_users: latestUsersResult.rows,
            users_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de utilizadores do hotspot:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/hotspot-registrations
 * DESCRIÇÃO: Retorna dados detalhados sobre os REGISTOS de utilizadores do hotspot.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 * PARÂMETROS:
 *  - period (query): Número de dias a serem considerados (ex: 7, 15, 30). Padrão é 30.
 *  - marketing (query): 'true' para filtrar apenas quem aceitou marketing.
 */
router.get('/hotspot-registrations', [verifyToken, checkPermission('analytics.details.hotspot_users')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;
    const marketingOnly = req.query.marketing === 'true';

    try {
        // [CORRIGIDO] A coluna correta para data de registo é 'data_cadastro'.
        let filterClause = `WHERE data_cadastro >= NOW() - INTERVAL '${period} days'`;
        if (marketingOnly) {
            filterClause += ` AND accepts_marketing = true`;
        }

        const latestUsersQuery = `
            SELECT
                nome_completo AS fullname,
                username AS email,
                data_cadastro AS created_at,
                accepts_marketing
            FROM userdetails
            ${filterClause}
            ORDER BY data_cadastro DESC
            LIMIT 100;
        `;

        const usersByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', data_cadastro), 'DD/MM') AS day,
                COUNT(*) AS count
            FROM userdetails
            ${filterClause}
            GROUP BY DATE_TRUNC('day', data_cadastro)
            ORDER BY DATE_TRUNC('day', data_cadastro) ASC;
        `;

        const [latestUsersResult, usersByDayResult] = await Promise.all([
            pool.query(latestUsersQuery),
            pool.query(usersByDayQuery)
        ]);

        const chartData = {
            labels: usersByDayResult.rows.map(row => row.day),
            data: usersByDayResult.rows.map(row => parseInt(row.count, 10))
        };

        const responseData = {
            latest_users: latestUsersResult.rows,
            registrations_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de registos do hotspot:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/routers-status
 * DESCRIÇÃO: Retorna uma lista de todos os roteadores com seu status detalhado.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/routers-status', [verifyToken, checkPermission('analytics.details.routers')], async (req, res) => {
    try {
        const query = `
            SELECT 
                r.name,
                r.ip_address,
                r.status,
                r.last_seen
            FROM routers r
            ORDER BY r.status DESC, r.name;
        `;

        const result = await pool.query(query);

        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Erro ao buscar status detalhado dos roteadores:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/users-by-router
 * DESCRIÇÃO: Retorna uma lista de usuários associados a um roteador específico.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/users-by-router', [verifyToken, checkPermission('analytics.details.routers')], async (req, res) => {
    const { router } = req.query;

    if (!router) {
        return res.status(400).json({ success: false, message: 'O nome do roteador é obrigatório.' });
    }

    try {
        let query = `
            SELECT 
                nome_completo AS fullname,
                username AS email,
                ultimo_login AS last_login
            FROM userdetails
        `;
        const params = [];

        if (router !== 'all') {
            query += ` WHERE router_name = $1`;
            params.push(router);
        }

        query += ` ORDER BY ultimo_login DESC;`;

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Erro ao buscar usuários por roteador:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/tickets
 * DESCRIÇÃO: Retorna dados detalhados sobre os tickets de suporte.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/tickets', [verifyToken, checkPermission('analytics.details.tickets')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // ---- Consulta para a Tabela de Últimos Tickets ----
        const latestTicketsQuery = `
            SELECT id, title, status, created_at
            FROM tickets
            WHERE updated_at >= NOW() - INTERVAL '${period} days'
            ORDER BY updated_at DESC
            LIMIT 100;
        `;

        // ---- Consulta para os Dados do Gráfico (Abertos vs Fechados por Dia) ----
        const ticketsByDayQuery = `
            WITH date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', NOW() - INTERVAL '${period - 1} days'),
                    DATE_TRUNC('day', NOW()),
                    '1 day'::interval
                )::date AS day
            )
            SELECT
                TO_CHAR(ds.day, 'DD/MM') AS label,
                COALESCE(opened.count, 0) AS opened_count,
                COALESCE(closed.count, 0) AS closed_count
            FROM date_series ds
            LEFT JOIN (
                SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS count
                FROM tickets
                WHERE created_at >= NOW() - INTERVAL '${period} days'
                GROUP BY day
            ) AS opened ON ds.day = opened.day
            LEFT JOIN (
                SELECT DATE_TRUNC('day', updated_at)::date AS day, COUNT(*) AS count
                FROM tickets
                WHERE status = 'fechado' AND updated_at >= NOW() - INTERVAL '${period} days'
                GROUP BY day
            ) AS closed ON ds.day = closed.day
            ORDER BY ds.day ASC;
        `;

        const [latestTicketsResult, ticketsByDayResult] = await Promise.all([
            pool.query(latestTicketsQuery),
            pool.query(ticketsByDayQuery)
        ]);

        const chartData = {
            labels: ticketsByDayResult.rows.map(r => r.label),
            opened: ticketsByDayResult.rows.map(r => parseInt(r.opened_count, 10)),
            closed: ticketsByDayResult.rows.map(r => parseInt(r.closed_count, 10)),
        };

        const responseData = {
            latest_tickets: latestTicketsResult.rows,
            tickets_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de tickets:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/lgpd-requests
 * DESCRIÇÃO: Retorna dados detalhados sobre os pedidos de exclusão de dados (LGPD).
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/lgpd-requests', [verifyToken, checkPermission('analytics.details.lgpd')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // ---- Consulta para a Tabela de Últimos Pedidos ----
        const latestRequestsQuery = `
            SELECT user_email, request_date, status, completion_date
            FROM data_exclusion_requests
            WHERE request_date >= NOW() - INTERVAL '${period} days'
            ORDER BY request_date DESC
            LIMIT 100;
        `;

        // ---- Consulta para os Dados do Gráfico (Pedidos por Dia) ----
        const requestsByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', request_date), 'DD/MM') AS day,
                COUNT(*) AS count
            FROM data_exclusion_requests
            WHERE request_date >= NOW() - INTERVAL '${period} days'
            GROUP BY DATE_TRUNC('day', request_date)
            ORDER BY DATE_TRUNC('day', request_date) ASC;
        `;

        const [latestRequestsResult, requestsByDayResult] = await Promise.all([
            pool.query(latestRequestsQuery),
            pool.query(requestsByDayQuery)
        ]);

        const chartData = {
            labels: requestsByDayResult.rows.map(r => r.day),
            data: requestsByDayResult.rows.map(r => parseInt(r.count, 10)),
        };

        const responseData = {
            latest_requests: latestRequestsResult.rows,
            requests_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de pedidos LGPD:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/admin-activity
 * DESCRIÇÃO: Retorna dados detalhados sobre a atividade dos administradores.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/admin-activity', [verifyToken, checkPermission('analytics.details.admin_activity')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // ---- Consulta para a Tabela de Últimas Ações ----
        const latestActionsQuery = `
            SELECT user_email, action, status, timestamp
            FROM audit_logs
            WHERE timestamp >= NOW() - INTERVAL '${period} days'
              AND user_email IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 100;
        `;

        // ---- Consulta para os Dados do Gráfico (Ações por Dia) ----
        const actionsByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', timestamp), 'DD/MM') AS day,
                COUNT(*) AS count
            FROM audit_logs
            WHERE timestamp >= NOW() - INTERVAL '${period} days'
              AND user_email IS NOT NULL
            GROUP BY DATE_TRUNC('day', timestamp)
            ORDER BY DATE_TRUNC('day', timestamp) ASC;
        `;

        const [latestActionsResult, actionsByDayResult] = await Promise.all([
            pool.query(latestActionsQuery),
            pool.query(actionsByDayQuery)
        ]);

        const chartData = {
            labels: actionsByDayResult.rows.map(r => r.day),
            data: actionsByDayResult.rows.map(r => parseInt(r.count, 10)),
        };

        const responseData = {
            latest_actions: latestActionsResult.rows,
            actions_by_day: chartData
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados de atividade dos administradores:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/raffles
 * DESCRIÇÃO: Retorna dados detalhados sobre a performance dos sorteios.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/raffles', [verifyToken, checkPermission('analytics.details.raffles')], async (req, res) => {
    const period = parseInt(req.query.period, 10) || 30;

    try {
        // ---- Consulta para o Gráfico (Participantes por Dia) ----
        const participantsByDayQuery = `
            SELECT 
                TO_CHAR(DATE_TRUNC('day', created_at), 'DD/MM') AS day,
                COUNT(DISTINCT user_id) AS count
            FROM raffle_participants
            WHERE created_at >= NOW() - INTERVAL '${period} days'
            GROUP BY DATE_TRUNC('day', created_at)
            ORDER BY DATE_TRUNC('day', created_at) ASC;
        `;

        // ---- Consulta para a Tabela de Últimos Vencedores ----
        const latestWinnersQuery = `
            SELECT 
                r.title, 
                u.username AS winner_email, 
                r.draw_date 
            FROM raffles r 
            JOIN userdetails u ON r.winner_id = u.id 
            WHERE r.winner_id IS NOT NULL 
            ORDER BY r.draw_date DESC 
            LIMIT 10;
        `;

        // ---- Consulta para a Tabela de Sorteios Populares ----
        const popularRafflesQuery = `
            SELECT 
                r.title, 
                COUNT(rp.id) AS participant_count 
            FROM raffles r 
            JOIN raffle_participants rp ON r.id = rp.raffle_id 
            GROUP BY r.id 
            ORDER BY participant_count DESC 
            LIMIT 10;
        `;

        const [
            participantsByDayResult,
            latestWinnersResult,
            popularRafflesResult
        ] = await Promise.all([
            pool.query(participantsByDayQuery),
            pool.query(latestWinnersQuery),
            pool.query(popularRafflesQuery)
        ]);

        const chartData = {
            labels: participantsByDayResult.rows.map(r => r.day),
            data: participantsByDayResult.rows.map(r => parseInt(r.count, 10)),
        };

        const responseData = {
            participants_by_day: chartData,
            latest_winners: latestWinnersResult.rows,
            popular_raffles: popularRafflesResult.rows
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de sorteios:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});


/**
 * ROTA: GET /api/dashboard/analytics/campaigns
 * DESCRIÇÃO: Retorna dados detalhados sobre o engajamento das campanhas.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/campaigns', [verifyToken, checkPermission('analytics.details.campaigns')], async (req, res) => {
    try {
        // ---- Consulta para o Gráfico (Campanhas mais vistas) ----
        const topCampaignsQuery = `
            SELECT 
                name, 
                view_count 
            FROM campaigns 
            WHERE view_count > 0
            ORDER BY view_count DESC 
            LIMIT 10;
        `;

        // ---- Consulta para a Tabela (Templates mais usados em campanhas ativas) ----
        const topTemplatesQuery = `
            SELECT 
                t.name AS template_name, 
                COUNT(c.id) AS campaign_count,
                SUM(c.view_count) AS total_views
            FROM templates t
            JOIN campaigns c ON t.id = c.template_id
            WHERE c.is_active = true
            GROUP BY t.name
            HAVING COUNT(c.id) > 0
            ORDER BY campaign_count DESC, total_views DESC
            LIMIT 10;
        `;

        const [topCampaignsResult, topTemplatesResult] = await Promise.all([
            pool.query(topCampaignsQuery),
            pool.query(topTemplatesQuery)
        ]);

        const chartData = {
            labels: topCampaignsResult.rows.map(r => r.name),
            data: topCampaignsResult.rows.map(r => parseInt(r.view_count, 10)),
        };

        const responseData = {
            top_campaigns_chart: chartData,
            top_templates_table: topTemplatesResult.rows
        };

        res.json({ success: true, data: responseData });

    } catch (error) {
        console.error('Erro ao buscar dados analíticos de campanhas:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a sua solicitação.' });
    }
});

/**
 * ROTA: GET /api/dashboard/analytics/server-health
 * DESCRIÇÃO: Retorna dados detalhados sobre a saúde do servidor.
 * PROTEÇÃO: Requer autenticação e perfil 'master'.
 */
router.get('/server-health', [verifyToken, checkPermission('analytics.details.server_health')], async (req, res) => {
    try {
        // Busca os últimos 10 eventos de 'START' e 'STOP' (simulados) do log de auditoria.
        // No futuro, isso pode ser uma tabela dedicada a eventos do sistema.
        const serviceEventsQuery = `
            SELECT 
                timestamp, 
                action, 
                description 
            FROM audit_logs 
            WHERE action LIKE 'SERVER_%' OR action LIKE 'RADIUS_%'
            ORDER BY timestamp DESC 
            LIMIT 20;
        `;

        const serviceEventsResult = await pool.query(serviceEventsQuery);

        const responseData = {
            service_events: serviceEventsResult.rows,
            // O gráfico de uptime histórico é complexo e requer um sistema de monitoramento externo.
            // Por enquanto, retornamos null para que o frontend possa exibir uma mensagem.
            uptime_history_chart: null
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        console.error('Erro ao buscar dados de saúde do servidor:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = router;
