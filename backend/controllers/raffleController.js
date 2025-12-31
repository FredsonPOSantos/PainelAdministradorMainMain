// Ficheiro: backend/controllers/raffleController.js
// Descrição: Contém a lógica de negócio para o sistema de sorteios.

const { pool } = require('../connection');
const { logAction } = require('../services/auditLogService');
const seedrandom = require('seedrandom');

// Gerar número do sorteio
const generateRaffleNumber = (raffleId) => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}${month}${year}-${hours}${minutes}.${raffleId}`;
};

// Criar um novo sorteio
const createRaffle = async (req, res) => {
    const { title, observation, filters } = req.body;
    const { userId, email } = req.user;

    if (!title) {
        return res.status(400).json({ success: false, message: 'O título é obrigatório.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const sequenceResult = await client.query("SELECT nextval('raffles_id_seq') as id");
        const raffleId = sequenceResult.rows[0].id;
        const raffleNumber = generateRaffleNumber(raffleId);

        await client.query(
            'INSERT INTO raffles (id, raffle_number, title, observation, created_by_user_id, filters) VALUES ($1, $2, $3, $4, $5, $6)',
            [raffleId, raffleNumber, title, observation, userId, filters]
        );

        await client.query('COMMIT');

        logAction({
            req,
            action: 'RAFFLE_CREATE',
            status: 'SUCCESS',
            description: `Sorteio #${raffleNumber} criado por ${email}`,
            target_id: raffleId,
            target_type: 'raffle'
        });

        res.status(201).json({ success: true, message: 'Sorteio criado com sucesso!', data: { raffleId, raffleNumber } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar sorteio:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

// Obter todos os sorteios
const getAllRaffles = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id, r.raffle_number, r.title, r.created_at, r.winner_id,
                u_creator.email AS created_by_email,
                u_winner.username AS winner_email
            FROM raffles r
            JOIN admin_users u_creator ON r.created_by_user_id = u_creator.id
            LEFT JOIN userdetails u_winner ON r.winner_id = u_winner.id
            ORDER BY r.created_at DESC
        `);

        res.json({ success: true, data: result.rows });

    } catch (error) {
        console.error('Erro ao buscar sorteios:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Obter um sorteio por ID
const getRaffleById = async (req, res) => {
    const { id } = req.params;

    try {
        const raffleResult = await pool.query(`
            SELECT 
                r.id, r.raffle_number, r.title, r.observation, r.created_at, r.filters,
                u_creator.email AS created_by_email,
                u_winner.username AS winner_email
            FROM raffles r
            JOIN admin_users u_creator ON r.created_by_user_id = u_creator.id
            LEFT JOIN userdetails u_winner ON r.winner_id = u_winner.id
            WHERE r.id = $1
        `, [id]);

        if (raffleResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sorteio não encontrado.' });
        }

        const participantsResult = await pool.query(`
            SELECT u.id, u.username as email
            FROM raffle_participants rp
            JOIN userdetails u ON rp.user_id = u.id
            WHERE rp.raffle_id = $1
        `, [id]);

        const response = {
            ...raffleResult.rows[0],
            participants: participantsResult.rows
        };

        res.json({ success: true, data: response });

    } catch (error) {
        console.error(`Erro ao buscar sorteio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// Realizar o sorteio
const drawRaffle = async (req, res) => {
    const { id } = req.params;
    const { email } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const raffleResult = await client.query('SELECT * FROM raffles WHERE id = $1', [id]);
        if (raffleResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sorteio não encontrado.' });
        }

        const raffle = raffleResult.rows[0];
        if (raffle.winner_id) {
            return res.status(400).json({ success: false, message: 'Este sorteio já foi realizado.' });
        }

        const { filters } = raffle;
        let query = 'SELECT id, username as email FROM userdetails';
        const params = [];
        const whereClauses = [];

        if (filters.consent) {
            whereClauses.push('accepts_marketing = true');
        }

        if (filters.campaign) {
            const campaignResult = await client.query('SELECT target_id FROM campaigns WHERE id = $1', [filters.campaign]);
            if (campaignResult.rows.length > 0) {
                const routerId = campaignResult.rows[0].target_id;
                const routerResult = await client.query('SELECT name FROM routers WHERE id = $1', [routerId]);
                if (routerResult.rows.length > 0) {
                    whereClauses.push(`router_name = $${params.length + 1}`);
                    params.push(routerResult.rows[0].name);
                }
            }
        }

        if (filters.router) {
            const routerResult = await client.query('SELECT name FROM routers WHERE id = $1', [filters.router]);
            if (routerResult.rows.length > 0) {
                whereClauses.push(`router_name = $${params.length + 1}`);
                params.push(routerResult.rows[0].name);
            }
        }

        if (filters.startDate && filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setDate(endDate.getDate() + 1);
            whereClauses.push(`data_cadastro BETWEEN $${params.length + 1} AND $${params.length + 2}`);
            params.push(filters.startDate, endDate.toISOString().split('T')[0]);
        }

        if (filters.loginStartDate && filters.loginEndDate) {
            const subQuery = `SELECT username FROM radacct WHERE acctstarttime BETWEEN $${params.length + 1} AND $${params.length + 2}`;
            whereClauses.push(`username IN (${subQuery})`);
            params.push(filters.loginStartDate, filters.loginEndDate);
        }

        if (whereClauses.length > 0) {
            query += ' WHERE ' + whereClauses.join(' AND ');
        }

        const participantsResult = await client.query(query, params);
        const participants = participantsResult.rows;

        if (participants.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum participante encontrado com os filtros selecionados.' });
        }

        // Salvar participantes
        for (const participant of participants) {
            await client.query('INSERT INTO raffle_participants (raffle_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, participant.id]);
        }

        // Lógica do sorteio determinístico
        const seed = `${raffle.raffle_number}-${participants.length}`;
        const rng = seedrandom(seed);
        const winnerIndex = Math.floor(rng() * participants.length);
        const winner = participants[winnerIndex];

        await client.query('UPDATE raffles SET winner_id = $1 WHERE id = $2', [winner.id, id]);

        await client.query('COMMIT');

        logAction({
            req,
            action: 'RAFFLE_DRAW',
            status: 'SUCCESS',
            description: `Sorteio #${raffle.raffle_number} realizado por ${email}. Vencedor: ${winner.email}`,
            target_id: id,
            target_type: 'raffle'
        });

        res.json({ success: true, message: 'Sorteio realizado com sucesso!', data: { winner } });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Erro ao realizar sorteio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

const getCampaigns = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM campaigns');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erro ao buscar campanhas:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

const getRouters = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name FROM routers');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Erro ao buscar roteadores:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// [NOVO] Atualizar um sorteio
const updateRaffle = async (req, res) => {
    const { id } = req.params;
    const { title, observation, filters } = req.body;
    const { email } = req.user;

    if (!title) {
        return res.status(400).json({ success: false, message: 'O título é obrigatório.' });
    }

    try {
        const result = await pool.query(
            'UPDATE raffles SET title = $1, observation = $2, filters = $3 WHERE id = $4 RETURNING *',
            [title, observation, filters, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Sorteio não encontrado.' });
        }

        logAction({
            req,
            action: 'RAFFLE_UPDATE',
            status: 'SUCCESS',
            description: `Sorteio #${result.rows[0].raffle_number} atualizado por ${email}`,
            target_id: id,
            target_type: 'raffle'
        });

        res.json({ success: true, message: 'Sorteio atualizado com sucesso!', data: result.rows[0] });

    } catch (error) {
        console.error(`Erro ao atualizar sorteio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
};

// [NOVO] Deletar um sorteio
const deleteRaffle = async (req, res) => {
    const { id } = req.params;
    const { email } = req.user;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Obter número do sorteio para o log
        const raffleInfo = await client.query('SELECT raffle_number FROM raffles WHERE id = $1', [id]);
        if (raffleInfo.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Sorteio não encontrado.' });
        }
        const raffleNumber = raffleInfo.rows[0].raffle_number;

        // Deletar participantes primeiro para evitar violação de chave estrangeira
        await client.query('DELETE FROM raffle_participants WHERE raffle_id = $1', [id]);
        
        // Deletar o sorteio
        await client.query('DELETE FROM raffles WHERE id = $1', [id]);

        await client.query('COMMIT');

        logAction({
            req,
            action: 'RAFFLE_DELETE',
            status: 'SUCCESS',
            description: `Sorteio #${raffleNumber} (ID: ${id}) deletado por ${email}`,
            target_id: id,
            target_type: 'raffle'
        });

        res.json({ success: true, message: 'Sorteio e seus participantes foram deletados com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Erro ao deletar sorteio ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

module.exports = {
    createRaffle,
    getAllRaffles,
    getRaffleById,
    drawRaffle,
    getCampaigns,
    getRouters,
    updateRaffle,
    deleteRaffle
};