// Ficheiro: backend/controllers/notificationController.js
// Descrição: Contém a lógica para gerir as notificações.

const pool = require('../connection');

// Obter a contagem de notificações não lidas para o utilizador logado
const getUnreadCount = async (req, res) => {
    const { userId } = req.user;

    try {
        const result = await pool.query(
            'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );
        const count = parseInt(result.rows[0].unread_count, 10);
        res.json({ success: true, data: { count } });
    } catch (error) {
        console.error('Erro ao buscar contagem de notificações não lidas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro de banco de dados ao buscar contagem de notificações.',
            db_error: error.message, // Passa a mensagem de erro real do DB
            db_code: error.code      // Passa o código de erro real do DB
        });
    }
};

// Marcar todas as notificações do utilizador como lidas
const markAllAsRead = async (req, res) => {
    const { userId } = req.user;

    try {
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1',
            [userId]
        );
        res.json({ success: true, message: 'Notificações marcadas como lidas.' });
    } catch (error) {
        console.error('Erro ao marcar notificações como lidas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro de banco de dados ao marcar notificações como lidas.',
            db_error: error.message,
            db_code: error.code
        });
    }
};

module.exports = {
    getUnreadCount,
    markAllAsRead
};
