// Ficheiro: controllers/templateController.js
// Descrição: Contém a lógica de negócio para a gestão de templates.

const pool = require('../connection'); // Caminho atualizado

/**
 * @description Cria um novo template.
 */
const createTemplate = async (req, res) => {
  // Adicionado 'prelogin_banner_id' aos campos
  const {
    name,
    base_model,
    login_background_url,
    logo_url,
    primary_color,
    font_size,
    font_color,
    promo_video_url,
    login_type,
    prelogin_banner_id, // <-- NOVO CAMPO
  } = req.body;

  if (!name || !base_model || !login_type) {
    return res.status(400).json({ message: 'Nome, modelo base (V1/V2) e tipo de login são obrigatórios.' });
  }
  if (base_model === 'V2' && !promo_video_url) {
    return res.status(400).json({ message: 'URL do vídeo promocional é obrigatória para templates V2.' });
  }

  try {
    const query = `
      INSERT INTO templates (name, base_model, login_background_url, logo_url, primary_color, font_size, font_color, promo_video_url, login_type, prelogin_banner_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [name, base_model, login_background_url, logo_url, primary_color, font_size, font_color, promo_video_url, login_type, prelogin_banner_id];
    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Template criado com sucesso!', template: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar template:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Obtém a lista de todos os templates.
 */
const getAllTemplates = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM templates ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Atualiza um template existente.
 */
const updateTemplate = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    base_model,
    login_background_url,
    logo_url,
    primary_color,
    font_size,
    font_color,
    promo_video_url,
    login_type,
    prelogin_banner_id, // <-- NOVO CAMPO
  } = req.body;

  try {
    const query = `
      UPDATE templates
      SET 
        name = $1, base_model = $2, login_background_url = $3, logo_url = $4,
        primary_color = $5, font_size = $6, font_color = $7, promo_video_url = $8,
        login_type = $9, prelogin_banner_id = $10
      WHERE id = $11
      RETURNING *;
    `;
    const values = [name, base_model, login_background_url, logo_url, primary_color, font_size, font_color, promo_video_url, login_type, prelogin_banner_id, id];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Template não encontrado.' });
    }
    res.json({ message: 'Template atualizado com sucesso!', template: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar template:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Elimina um template.
 */
const deleteTemplate = async (req, res) => {
  const { id } = req.params;
  try {
    const checkUsageQuery = 'SELECT id FROM campaigns WHERE template_id = $1';
    const usageResult = await pool.query(checkUsageQuery, [id]);
    if (usageResult.rowCount > 0) {
      return res.status(409).json({ message: 'Não é possível eliminar este template, pois está a ser utilizado por uma ou mais campanhas.' });
    }
    const result = await pool.query('DELETE FROM templates WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Template não encontrado.' });
    }
    res.json({ message: 'Template eliminado com sucesso.' });
  } catch (error) {
    console.error('Erro ao eliminar template:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

module.exports = {
  createTemplate,
  getAllTemplates,
  updateTemplate,
  deleteTemplate,
};

