// Ficheiro: controllers/campaignController.js
// Descrição: Contém a lógica de negócio para a gestão de campanhas.

const pool = require('../connection'); // Caminho atualizado

/**
 * @description Retorna um Set com os IDs de todos os roteadores que já estão em uma campanha ativa.
 * @param {number} campaignIdToExclude - Opcional. ID de uma campanha a ser ignorada na verificação (útil ao atualizar).
 * @returns {Promise<Set<number>>} - Um Set com os IDs dos roteadores ocupados.
 */
const getOccupiedRouterIds = async (campaignIdToExclude = null, client = pool) => {
    const occupiedIds = new Set();
    
    let activeCampaignsQuery = 'SELECT id, target_type, target_id FROM campaigns WHERE is_active = true';
    const queryParams = [];
    
    if (campaignIdToExclude) {
        activeCampaignsQuery += ' AND id != $1';
        queryParams.push(campaignIdToExclude);
    }

    const activeCampaignsResult = await pool.query(activeCampaignsQuery, queryParams);
    const activeCampaigns = activeCampaignsResult.rows;

    for (const campaign of activeCampaigns) {
        if (campaign.target_type === 'single_router') {
            occupiedIds.add(campaign.target_id);
        } else if (campaign.target_type === 'group') {
            const groupRoutersResult = await pool.query('SELECT id FROM routers WHERE group_id = $1', [campaign.target_id]);
            groupRoutersResult.rows.forEach(r => occupiedIds.add(r.id));
        } else if (campaign.target_type === 'all') {
            const allRoutersResult = await pool.query('SELECT id FROM routers');
            allRoutersResult.rows.forEach(r => occupiedIds.add(r.id));
        }
    }

    return occupiedIds;
};


/**
 * @description Cria uma nova campanha.
 */
const createCampaign = async (req, res) => {
  const { name, template_id, target_type, target_id, start_date, end_date, is_active } = req.body;

  // Validação de entrada
  if (!name || !template_id || !target_type || !start_date || !end_date) {
    return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }
  if (['group', 'single_router'].includes(target_type) && !target_id) {
    return res.status(400).json({ message: 'Para alvos do tipo "group" ou "single_router", o target_id é obrigatório.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Regra de negócio: Validação de conflito de roteadores em campanhas
    const occupiedRouterIds = await getOccupiedRouterIds(null, client);
    let targetRouterIds = [];

    if (target_type === 'single_router') {
        targetRouterIds.push(parseInt(target_id, 10));
    } else if (target_type === 'group') {
        const groupRouters = await client.query('SELECT id FROM routers WHERE group_id = $1', [target_id]);
        targetRouterIds = groupRouters.rows.map(r => r.id);
    } else if (target_type === 'all') {
        const allRouters = await client.query('SELECT id FROM routers');
        targetRouterIds = allRouters.rows.map(r => r.id);
    }

    const conflict = targetRouterIds.some(id => occupiedRouterIds.has(id));
    if (conflict) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Conflito: Um ou mais roteadores selecionados já pertencem a outra campanha ativa.' });
    }

    // Regra de negócio: Não é permitido aplicar campanha individual em roteadores que pertençam a grupos.
    if (target_type === 'single_router') {
      const routerCheck = await client.query('SELECT group_id FROM routers WHERE id = $1', [target_id]);
      if (routerCheck.rows.length > 0 && routerCheck.rows[0].group_id !== null) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Este roteador pertence a um grupo e não pode receber uma campanha individual.' });
      }
    }

    const query = `
      INSERT INTO campaigns (name, template_id, target_type, target_id, start_date, end_date, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [name, template_id, target_type, target_id, start_date, end_date, is_active || false];
    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Campanha criada com sucesso!', campaign: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar campanha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};

/**
 * @description Obtém a lista de todas as campanhas.
 */
const getAllCampaigns = async (req, res) => {
  try {
    // Query para obter informações detalhadas, incluindo o nome do template
    const query = `
      SELECT c.*, t.name as template_name
      FROM campaigns c
      JOIN templates t ON c.template_id = t.id
      ORDER BY c.start_date DESC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Atualiza uma campanha existente.
 */
const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { name, template_id, target_type, target_id, start_date, end_date, is_active } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validação de conflito
    if (is_active) {
        const occupiedRouterIds = await getOccupiedRouterIds(id, client);
        let targetRouterIds = [];

        if (target_type === 'single_router') {
            targetRouterIds.push(parseInt(target_id, 10));
        } else if (target_type === 'group') {
            const groupRouters = await client.query('SELECT id FROM routers WHERE group_id = $1', [target_id]);
            targetRouterIds = groupRouters.rows.map(r => r.id);
        } else if (target_type === 'all') {
            const allRouters = await client.query('SELECT id FROM routers');
            targetRouterIds = allRouters.rows.map(r => r.id);
        }

        const conflict = targetRouterIds.some(id => occupiedRouterIds.has(id));
        if (conflict) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: 'Conflito: Um ou mais roteadores selecionados já pertencem a outra campanha ativa.' });
        }
    }

    const query = `
      UPDATE campaigns
      SET name = $1, template_id = $2, target_type = $3, target_id = $4, start_date = $5, end_date = $6, is_active = $7
      WHERE id = $8
      RETURNING *;
    `;
    const values = [name, template_id, target_type, target_id, start_date, end_date, is_active, id];
    const result = await client.query(query, values);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Campanha não encontrada.' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Campanha atualizada com sucesso!', campaign: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  } finally {
    client.release();
  }
};

/**
 * @description Elimina uma campanha.
 */
const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM campaigns WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada.' });
    }
    res.json({ message: 'Campanha eliminada com sucesso.' });
  } catch (error) {
    console.error('Erro ao eliminar campanha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

const getAvailableTargets = async (req, res) => {
    const { campaign_id } = req.query;

    try {
        const occupiedRouterIds = await getOccupiedRouterIds(campaign_id);

        let availableRouters;
        if (occupiedRouterIds.size > 0) {
            const availableRoutersResult = await pool.query(
                'SELECT id, name FROM routers WHERE id <> ALL($1::int[])',
                [Array.from(occupiedRouterIds)]
            );
            availableRouters = availableRoutersResult.rows;
        } else {
            const availableRoutersResult = await pool.query('SELECT id, name FROM routers');
            availableRouters = availableRoutersResult.rows;
        }

        // Busca todos os grupos
        const allGroupsResult = await pool.query('SELECT id, name FROM router_groups');
        const allGroups = allGroupsResult.rows;

        // Filtra os grupos para incluir apenas aqueles em que NENHUM roteador está ocupado
        const availableGroups = [];
        for (const group of allGroups) {
            const groupRoutersResult = await pool.query('SELECT id FROM routers WHERE group_id = $1', [group.id]);
            const groupRouterIds = groupRoutersResult.rows.map(r => r.id);
            const isGroupAvailable = !groupRouterIds.some(id => occupiedRouterIds.has(id));
            if (isGroupAvailable) {
                availableGroups.push(group);
            }
        }

        res.json({
            routers: availableRouters,
            groups: availableGroups
        });

    } catch (error) {
        console.error('Erro ao buscar alvos disponíveis:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};


module.exports = {
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
  getAvailableTargets,
};