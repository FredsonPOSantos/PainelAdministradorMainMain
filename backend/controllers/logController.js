// Ficheiro: backend/controllers/logController.js
// Descrição: Lida com a busca e visualização de logs de auditoria.

const pool = require('../connection');

/**
 * Busca os logs de auditoria do sistema.
 * Por enquanto, busca os 200 registos mais recentes.
 */
const getAuditLogs = async (req, res) => {
    const { keyword, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT id, timestamp, user_email, ip_address, action, status, description, target_type, target_id
            FROM audit_logs
        `;

        const whereClauses = [];
        const params = [];
        let paramIndex = 1;

        if (keyword) {
            whereClauses.push(`(user_email ILIKE $${paramIndex++} OR action ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`);
            params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
        }

        if (startDate) {
            whereClauses.push(`timestamp >= $${paramIndex++}`);
            params.push(startDate);
        }

        if (endDate) {
            whereClauses.push(`timestamp <= $${paramIndex++}`);
            params.push(endDate);
        }

        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(' AND ')}`;
        }

        query += ` ORDER BY timestamp DESC LIMIT 200`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        res.status(500).json({ message: 'Erro interno ao buscar logs.' });
    }
};

module.exports = { getAuditLogs };