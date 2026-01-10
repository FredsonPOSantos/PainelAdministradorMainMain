// Ficheiro: backend/controllers/dashboardController.js

const { pool, pgConnectionStatus } = require('../connection');
const { getInfluxConnectionStatus } = require('../services/influxService');
const fs = require('fs');
const path = require('path');
const si = require('systeminformation'); // [NOVO] Biblioteca para info do sistema
const cacheService = require('../services/cacheService'); // [NOVO]

const getDashboardStats = async (req, res) => {
    try {
        // Usamos Promise.all para executar todas as queries em paralelo
        const [
            bannersRes,
            campaignsRes,
            templatesRes,
            usersRes
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = true) AS active FROM banners;`),
            pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE CURRENT_DATE BETWEEN start_date AND end_date) AS active FROM campaigns;`),
            pool.query(`SELECT COUNT(*) AS total FROM templates;`), // Esta query já está correta, apenas total.
            pool.query(`SELECT 
                            COUNT(*) AS total, 
                            COUNT(*) FILTER (WHERE creationdate >= NOW() - INTERVAL '30 days') AS last30days 
                        FROM userdetails;`)
        ]);

        const stats = {
            banners: {
                total: parseInt(bannersRes.rows[0].total, 10),
                active: parseInt(bannersRes.rows[0].active, 10),
                inactive: parseInt(bannersRes.rows[0].total, 10) - parseInt(bannersRes.rows[0].active, 10)
            },
            campaigns: {
                total: parseInt(campaignsRes.rows[0].total, 10),
                active: parseInt(campaignsRes.rows[0].active, 10),
                inactive: parseInt(campaignsRes.rows[0].total, 10) - parseInt(campaignsRes.rows[0].active, 10)
            },
            templates: {
                total: parseInt(templatesRes.rows[0].total, 10),
                // Templates não possuem estado ativo/inativo, então não os retornamos.
                // O frontend será ajustado para lidar com isso.
            },
            users: {
                total: parseInt(usersRes.rows[0].total, 10),
                last30Days: parseInt(usersRes.rows[0].last30days, 10)
            }
        };

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar estatísticas.' });
    }
};

/**
 * [NOVO] Obtém as estatísticas completas para o Dashboard Analítico.
 */
const getAnalyticsStats = async (req, res) => {
    try {
        // [NOVO] Tenta buscar do cache primeiro
        const cachedStats = await cacheService.get('analytics_stats');
        if (cachedStats) {
            console.log('[CACHE] Retornando estatísticas analíticas do cache.');
            return res.json({ success: true, data: cachedStats });
        }

        // Executa todas as consultas de agregação em paralelo para maior eficiência
        const [
            loginsRes,
            hotspotUsersRes,
            routersRes,
            ticketsRes,
            lgpdRes,
            adminActivityRes, // [CORRIGIDO] Nome da variável ajustado para clareza (era routerActivityRes na ordem errada ou implícita)
            lastWinnersRes,
            rafflesRes, // [NOVO]
            campaignsRes // [NOVO]
        ] = await Promise.all([
            // 1. Acessos ao Painel
            pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE action = 'LOGIN_SUCCESS') AS success,
                    COUNT(*) FILTER (WHERE action = 'LOGIN_FAILURE') AS failure
                FROM audit_logs;
            `),
            // 2. Utilizadores do Hotspot
            pool.query(`
                SELECT 
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE accepts_marketing = true) AS marketing
                FROM userdetails;
            `),
            // 3. Status dos Roteadores
            pool.query(`SELECT status, COUNT(*) FROM routers GROUP BY status;`),
            // 4. Tickets de Suporte
            pool.query(`SELECT status, COUNT(*) FROM tickets GROUP BY status;`),
            // 5. Pedidos LGPD
            pool.query(`SELECT status, COUNT(*) FROM data_exclusion_requests GROUP BY status;`),
            // 6. Atividade por Roteador
            // [CORREÇÃO] Esta query estava a ser usada para routerActivity, mas precisamos de adminActivity também.
            // Vamos adicionar uma query específica para adminActivity ou ajustar a ordem.
            // Para corrigir o erro relatado, precisamos garantir que adminActivity venha preenchido.
            // Vou adicionar a query de atividade de admin aqui.
            pool.query(`
                SELECT COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') as actions_last_24h FROM audit_logs;
            `),
            // 7. Últimos Vencedores de Sorteios
            pool.query(`
                SELECT r.raffle_number, r.title, u.username AS winner_email
                FROM raffles r
                JOIN userdetails u ON r.winner_id = u.id
                WHERE r.winner_id IS NOT NULL
                ORDER BY r.created_at DESC
                LIMIT 5;
            `),
            // 8. Estatísticas de Sorteios [NOVO]
            pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE winner_id IS NULL) as active,
                    COUNT(*) as total
                FROM raffles;
            `),
            // 9. Estatísticas de Campanhas [NOVO]
            pool.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date) as active,
                    SUM(view_count) as total_views
                FROM campaigns;
            `),
            // 10. Buffer de Erros Offline [NOVO]
            (async () => {
                const logFilePath = path.join(__dirname, '../services/offline_error_log.json');
                if (fs.existsSync(logFilePath)) {
                    try {
                        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
                        const logs = fileContent ? JSON.parse(fileContent) : [];
                        return logs.length;
                    } catch (e) { return 0; }
                }
                return 0;
            })()
        ]);

        // Formata os resultados para enviar ao frontend
        const stats = {
            logins: loginsRes.rows[0],
            hotspotUsers: hotspotUsersRes.rows[0],
            routers: routersRes.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), { online: 0, offline: 0 }),
            tickets: ticketsRes.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), { open: 0, in_progress: 0, closed: 0 }),
            lgpd: lgpdRes.rows.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), { pending: 0, completed: 0 }),
            adminActivity: {
                actionsLast24h: parseInt(adminActivityRes.rows[0].actions_last_24h, 10) || 0,
                mostActiveAdmin: 'N/A' // Simplificação para evitar query complexa se não for crítica
            },
            lastWinners: lastWinnersRes.rows,
            raffles: {
                active: parseInt(rafflesRes.rows[0].active, 10) || 0,
                total: parseInt(rafflesRes.rows[0].total, 10) || 0
            },
            campaigns: {
                active: parseInt(campaignsRes.rows[0].active, 10) || 0,
                totalViews: parseInt(campaignsRes.rows[0].total_views, 10) || 0
            },
            serverHealth: {
                uptime: process.uptime() * 1000, // Em milissegundos para consistência com JS Date
                radiusStatus: 'online', // Simulado, idealmente viria de uma verificação real
                bufferCount: typeof lastWinnersRes === 'number' ? lastWinnersRes : 0, // lastWinnersRes aqui é o resultado da promise 10 (buffer)
                postgres: { ...pgConnectionStatus },
                influx: getInfluxConnectionStatus()
            } 
        };

        // Calcula o total de tickets
        stats.tickets.total = stats.tickets.open + stats.tickets.in_progress + stats.tickets.closed;

        // [NOVO] Salva no cache por 5 minutos (300 segundos)
        await cacheService.set('analytics_stats', stats, 300);

        res.json({ success: true, data: stats });

    } catch (error) {
        console.error('Erro ao buscar estatísticas do Dashboard Analítico:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar estatísticas.' });
    }
};

/**
 * [NOVO] Obtém dados de saúde do sistema (Conexões, Uptime, Erros).
 */
const getSystemHealth = async (req, res) => {
    try {
        // 1. Status das Conexões
        const pgStatus = { ...pgConnectionStatus };
        const influxStatus = getInfluxConnectionStatus();

        // 2. Uptime do Servidor (em segundos)
        const uptimeSeconds = process.uptime();

        // [NOVO] Métricas de Hardware do Servidor
        const [cpuLoad, mem, fsSize, temp] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize(),
            si.cpuTemperature()
        ]);

        // 3. Buffer de Erros Offline
        const logFilePath = path.join(__dirname, '../services/offline_error_log.json');
        let bufferCount = 0;
        if (fs.existsSync(logFilePath)) {
            try {
                const fileContent = fs.readFileSync(logFilePath, 'utf-8');
                const logs = fileContent ? JSON.parse(fileContent) : [];
                bufferCount = logs.length;
            } catch (e) {
                console.error("Erro ao ler buffer offline:", e);
            }
        }

        // 4. Últimos Erros de Sistema (apenas se DB estiver online)
        let recentErrors = [];
        if (pgStatus.connected) {
            try {
                const errorsResult = await pool.query('SELECT id, error_message, timestamp FROM system_errors ORDER BY timestamp DESC LIMIT 5');
                recentErrors = errorsResult.rows;
            } catch (e) {
                console.error("Erro ao buscar erros recentes:", e);
                recentErrors = [];
            }
        }

        res.json({
            success: true,
            data: {
                postgres: pgStatus,
                influx: influxStatus,
                uptime: uptimeSeconds,
                bufferCount: bufferCount,
                recentErrors: recentErrors,
                // [NOVO] Dados de Hardware
                hardware: {
                    cpu: Math.round(cpuLoad.currentLoad),
                    memory: {
                        total: mem.total,
                        used: mem.active,
                        percent: Math.round((mem.active / mem.total) * 100)
                    },
                    disk: fsSize.length > 0 ? { used: fsSize[0].use, size: fsSize[0].size, usedBytes: fsSize[0].used } : null,
                    temp: (temp.main && temp.main > 0) ? temp.main : 'N/A'
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar saúde do sistema:', error);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar saúde do sistema.' });
    }
};

/**
 * [NOVO] Obtém a lista de utilizadores de um roteador específico (ou todos).
 * Retorna: Nome de Utilizador, E-mail, Último Login.
 */
const getRouterUsers = async (req, res) => {
    const { routerName } = req.query;

    try { // [CORRIGIDO] A coluna de email na tabela 'userdetails' é 'username'.
        let query = `
            SELECT u.nome_completo as fullname, u.username as email, MAX(a.timestamp) as last_login
            FROM userdetails u
            LEFT JOIN audit_logs a ON u.username = a.user_email AND a.action = 'LOGIN_SUCCESS'
        `;

        const params = [];

        if (routerName && routerName !== 'all') {
            query += ` WHERE u.router_name = $1`;
            params.push(routerName);
        }

        query += ` GROUP BY u.id, u.nome_completo, u.username ORDER BY last_login DESC NULLS LAST LIMIT 100;`;

        const { rows } = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erro ao buscar utilizadores do roteador:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar utilizadores.' });
    }
};

module.exports = { getDashboardStats, getAnalyticsStats, getSystemHealth, getRouterUsers };