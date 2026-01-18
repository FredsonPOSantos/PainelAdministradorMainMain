// Ficheiro: controllers/hotspotController.js
const { pool } = require('../connection');
const { Parser } = require('json2csv');

// Função principal para pesquisar utilizadores do hotspot
const searchUsers = async (req, res) => {
    try {
        // --- ALTERAÇÃO: Formata as datas para o padrão brasileiro DD-MM-YYYY HH24:MI ---
        let query = `
            SELECT 
                id, 
                username as email, 
                nome_completo as name, 
                telefone as phone, 
                mac_address, 
                router_name, 
                TO_CHAR(data_cadastro, 'DD-MM-YYYY HH24:MI') as created_at, 
                COALESCE(TO_CHAR(ultimo_login, 'DD-MM-YYYY HH24:MI'), 'N/A') as last_login 
            FROM userdetails WHERE 1=1`;
            
        const params = [];
        let paramIndex = 1;

        // --- Aplicação dos Filtros ---
        const { startDate, endDate, lastLoginStart, lastLoginEnd, routerId, groupId, campaignId } = req.query;

        // Filtro por data de registo (usando a coluna correta 'data_cadastro')
        if (startDate) {
            query += ` AND data_cadastro::DATE >= $${paramIndex++}::DATE`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND data_cadastro::DATE <= $${paramIndex++}::DATE`;
            params.push(endDate);
        }
        
        // Filtro por data do último login (usando a coluna correta 'ultimo_login')
        if (lastLoginStart) {
            query += ` AND ultimo_login::DATE >= $${paramIndex++}::DATE`;
            params.push(lastLoginStart);
        }
        if (lastLoginEnd) {
            query += ` AND ultimo_login::DATE <= $${paramIndex++}::DATE`;
            params.push(lastLoginEnd);
        }

        // Filtro por roteador específico ou por grupo (agora baseado em 'router_name')
        if (routerId) {
            const routerData = await pool.query('SELECT name FROM routers WHERE id = $1', [routerId]);
            if (routerData.rows.length > 0) {
                query += ` AND router_name = $${paramIndex++}`;
                params.push(routerData.rows[0].name);
            }
        } else if (groupId) {
            const routersInGroup = await pool.query('SELECT name FROM routers WHERE group_id = $1', [groupId]);
            const routerNames = routersInGroup.rows.map(r => r.name);
            if (routerNames.length > 0) {
                query += ` AND router_name = ANY($${paramIndex++}::text[])`;
                params.push(routerNames);
            } else {
                // Se o grupo não tem roteadores, garante que a pesquisa não retorna nada
                query += ` AND 1=0`;
            }
        }
        
        // O filtro por campanha foi comentado pois não há coluna correspondente em 'userdetails'
        /*
        if (campaignId) {
            query += ` AND last_campaign_id = $${paramIndex++}`;
            params.push(campaignId);
        }
        */

        // Ordena pela coluna original para garantir a ordem cronológica correta
        query += ` ORDER BY data_cadastro DESC`; 
        
        const { rows } = await pool.query(query, params);
        res.json(rows);

    } catch (error) {
        console.error('Erro ao pesquisar utilizadores do hotspot:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

// [NOVO] Função para contar o total de utilizadores do hotspot (para o Dashboard)
const getTotalHotspotUsers = async (req, res) => {
  try {
    // [MODIFICADO] Query para contar o total e os registos dos últimos 30 dias
    const result = await pool.query(`
        SELECT 
            COUNT(id) AS total,
            COUNT(id) FILTER (WHERE data_cadastro >= NOW() - INTERVAL '30 days') AS last30days
        FROM userdetails
    `);
    
    const total = parseInt(result.rows[0].total, 10) || 0;
    const last30days = parseInt(result.rows[0].last30days, 10) || 0;
    
    res.json({ success: true, data: { total, last30days } });
  } catch (error) {
    console.error('Erro ao contar utilizadores do hotspot:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};


// [MODIFICADO] Exporta a nova função
module.exports = {
    searchUsers,
    getTotalHotspotUsers 
};
