// Ficheiro: backend/services/auditLogService.js
// Descrição: Serviço centralizado para gravação de logs de auditoria.

const { pool, logOfflineEvent } = require('../connection');

/**
 * Grava uma ação de auditoria no banco de dados.
 * 
 * @param {object} logData - Os dados do log a serem gravados.
 * @param {object} [logData.req] - O objeto de requisição do Express (para obter IP e dados do usuário).
 * @param {string} logData.action - O código da ação (ex: 'LOGIN_SUCCESS', 'USER_UPDATE').
 * @param {string} logData.status - O status da ação ('SUCCESS' ou 'FAILURE').
 * @param {string} [logData.description] - Uma descrição legível do evento.
 * @param {string} [logData.target_type] - O tipo do alvo da ação (ex: 'user', 'settings').
 * @param {string|number} [logData.target_id] - O ID do alvo.
 * @param {object} [logData.details] - Um objeto JSON com detalhes extras (ex: campos alterados).
 * @param {number} [logData.user_id] - Opcional. Força o ID do usuário (útil para ações antes do login).
 * @param {string} [logData.user_email] - Opcional. Força o email do usuário.
 */
const logAction = async (logData) => {
    const {
        req,
        action,
        status,
        description = null,
        target_type = null,
        target_id = null,
        details = null,
        user_id = null,
        user_email = null
    } = logData;

    try {
        // Tenta extrair informações do objeto 'req' se ele for fornecido
        const finalUserId = user_id || (req && req.user ? req.user.userId : null);
        const finalUserEmail = user_email || (req && req.user ? req.user.email : (req && req.body ? req.body.email : null));
        const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;

        await pool.query(
            `INSERT INTO audit_logs (user_id, user_email, ip_address, action, status, description, target_type, target_id, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [finalUserId, finalUserEmail, ipAddress, action, status, description, target_type, target_id, details]
        );
    } catch (error) {
        console.error('Falha ao gravar no log de auditoria:', error);
        if (logOfflineEvent) {
            logOfflineEvent('AUDIT_LOG_FAILURE', 'Falha ao gravar log de auditoria', error.message);
        }
    }
};

module.exports = { logAction };