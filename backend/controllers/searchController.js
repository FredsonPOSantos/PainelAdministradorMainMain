// Ficheiro: backend/controllers/searchController.js
const { pool } = require('../connection');

const globalSearch = async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.json({ success: true, data: [] });
    }

    const term = `%${q}%`;
    
    try {
        const [routers, users, tickets] = await Promise.all([
            // Busca Roteadores
            pool.query(`
                SELECT id, name, ip_address, 'router' as type 
                FROM routers 
                WHERE name ILIKE $1 OR ip_address ILIKE $1 
                LIMIT 5
            `, [term]),
            
            // Busca Utilizadores Hotspot
            pool.query(`
                SELECT id, nome_completo as name, username as email, 'user' as type 
                FROM userdetails 
                WHERE nome_completo ILIKE $1 OR username ILIKE $1 OR mac_address ILIKE $1 
                LIMIT 5
            `, [term]),

            // Busca Tickets
            pool.query(`
                SELECT id, title as name, ticket_number as info, 'ticket' as type 
                FROM tickets 
                WHERE title ILIKE $1 OR ticket_number ILIKE $1 
                LIMIT 5
            `, [term])
        ]);

        const results = [
            ...routers.rows,
            ...users.rows,
            ...tickets.rows
        ];

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Erro na busca global:', error);
        res.status(500).json({ message: 'Erro ao realizar busca.' });
    }
};

module.exports = { globalSearch };