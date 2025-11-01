// Ficheiro: controllers/bannerController.js
const pool = require('../connection');

// ... (as suas funções createBanner, getAllBanners, updateBanner, deleteBanner devem permanecer aqui) ...
/**
 * @description Cria um novo banner.
 */
const createBanner = async (req, res) => {
  const { name, image_url, target_url, display_time_seconds, type, is_active } = req.body;

  // Validação
  if (!name || !image_url || !type) {
    return res.status(400).json({ message: 'Nome, URL da imagem e tipo (pre-login/post-login) são obrigatórios.' });
  }

  try {
    const query = `
      INSERT INTO banners (name, image_url, target_url, display_time_seconds, type, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [name, image_url, target_url, display_time_seconds || 5, type, is_active || false];
    const result = await pool.query(query, values);

    res.status(201).json({ message: 'Banner criado com sucesso!', banner: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar banner:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Obtém a lista de todos os banners.
 */
const getAllBanners = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM banners ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Atualiza um banner existente.
 */
const updateBanner = async (req, res) => {
  const { id } = req.params;
  const { name, image_url, target_url, display_time_seconds, type, is_active } = req.body;

  try {
    const query = `
      UPDATE banners
      SET 
        name = $1, image_url = $2, target_url = $3, 
        display_time_seconds = $4, type = $5, is_active = $6
      WHERE id = $7
      RETURNING *;
    `;
    const values = [name, image_url, target_url, display_time_seconds, type, is_active, id];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Banner não encontrado.' });
    }

    res.json({ message: 'Banner atualizado com sucesso!', banner: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};

/**
 * @description Elimina um banner.
 */
const deleteBanner = async (req, res) => {
  const { id } = req.params;
  try {
    // Adicionar validação futura se banners forem associados a templates
    const result = await pool.query('DELETE FROM banners WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Banner não encontrado.' });
    }
    res.json({ message: 'Banner eliminado com sucesso.' });
  } catch (error) {
    console.error('Erro ao eliminar banner:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
};


// --- NOVA FUNÇÃO DE UPLOAD ---
/**
 * @description Processa o upload da imagem de um banner e retorna a sua URL pública.
 */
const uploadBannerImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro foi enviado.' });
    }

    // Assume-se que a sua pasta de uploads está a ser servida estaticamente.
    // O URL é construído com base na pasta de destino definida no 'uploadMiddleware'.
    const imageUrl = `/uploads/banners/${req.file.filename}`;

    res.status(201).json({
        message: 'Imagem enviada com sucesso!',
        imageUrl: imageUrl
    });
};


module.exports = {
  createBanner,
  getAllBanners,
  updateBanner,
  deleteBanner,
  uploadBannerImage // Exportar a nova função
};
