// Ficheiro: controllers/campaignController.js
// Descrição: Contém a lógica de negócio para a gestão de campanhas.

const pool = require('../connection'); // Caminho atualizado

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
    // Regra de negócio: Não é permitido aplicar campanha individual em roteadores que pertençam a grupos.
    if (target_type === 'single_router') {
      const routerCheck = await client.query('SELECT group_id FROM routers WHERE id = $1', [target_id]);
      if (routerCheck.rows.length > 0 && routerCheck.rows[0].group_id !== null) {
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

    res.status(201).json({ message: 'Campanha criada com sucesso!', campaign: result.rows[0] });
  } catch (error) {
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

  try {
    const query = `
      UPDATE campaigns
      SET name = $1, template_id = $2, target_type = $3, target_id = $4, start_date = $5, end_date = $6, is_active = $7
      WHERE id = $8
      RETURNING *;
    `;
    const values = [name, template_id, target_type, target_id, start_date, end_date, is_active, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campanha não encontrada.' });
    }

    res.json({ message: 'Campanha atualizada com sucesso!', campaign: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
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


module.exports = {
  createCampaign,
  getAllCampaigns,
  updateCampaign,
  deleteCampaign,
};
