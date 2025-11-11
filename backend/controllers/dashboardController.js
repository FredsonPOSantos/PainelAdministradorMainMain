// Ficheiro: backend/controllers/dashboardController.js

const pool = require('../connection');

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

module.exports = { getDashboardStats };