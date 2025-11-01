// Ficheiro: controllers/hotspotController.js
const pool = require('../connection');
const { Parser } = require('json2csv');

// Função principal para pesquisar utilizadores do hotspot
const searchUsers = async (req, res) => {
    try {
        // --- ALTERAÇÃO: Formata as datas para o padrão brasileiro DD-MM-YYYY HH24:MI ---
        let query = `
            SELECT 
                id AS "ID", 
                username AS "Email", 
                nome_completo AS "Nome Completo", 
                telefone AS "Telefone", 
                mac_address AS "Endereço MAC", 
                router_name AS "Roteador", 
                TO_CHAR(data_cadastro, 'DD-MM-YYYY HH24:MI') AS "Data de Cadastro", 
                COALESCE(TO_CHAR(ultimo_login, 'DD-MM-YYYY HH24:MI'), 'N/A') AS "Último Login" 
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
    // Query otimizada para apenas contar os registos
    const result = await pool.query('SELECT COUNT(id) FROM userdetails'); 
    
    // Garante que o resultado é um número
    const count = parseInt(result.rows[0].count, 10) || 0;
    
    res.json({ count });
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
