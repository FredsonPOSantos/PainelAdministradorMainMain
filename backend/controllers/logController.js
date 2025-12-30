// Ficheiro: backend/controllers/logController.js
// Descrição: Lida com a busca e visualização de logs de auditoria.

const { pool } = require('../connection');

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

/**
 * [NOVO] Busca os logs de erro do sistema.
 */
const getSystemLogs = async (req, res) => {
    const { keyword, startDate, endDate } = req.query;

    try {
        let query = `
            SELECT id, timestamp, error_message, stack_trace, request_method, request_url, request_body, user_email
            FROM system_errors
        `;

        const whereClauses = [];
        const params = [];
        let paramIndex = 1;

        if (keyword) {
            whereClauses.push(`(error_message ILIKE $${paramIndex++} OR stack_trace ILIKE $${paramIndex++} OR request_url ILIKE $${paramIndex++})`);
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

        query += ` ORDER BY timestamp DESC LIMIT 500`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar logs de sistema:', error);
        res.status(500).json({ message: 'Erro interno ao buscar logs de sistema.' });
    }
};

module.exports = { getAuditLogs, getSystemLogs };