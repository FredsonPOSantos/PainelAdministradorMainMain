// Ficheiro: controllers/routerController.js
const pool = require('../connection');
const ping = require('ping'); // Importa a biblioteca de ping

// --- Funções de Roteadores Individuais ---

const getAllRouters = async (req, res) => {
  try {
    const allRouters = await pool.query('SELECT id, name, status, observacao, group_id, ip_address FROM routers ORDER BY name ASC');
    res.json(allRouters.rows);
  } catch (error) {
    console.error('Erro ao listar roteadores:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

const updateRouter = async (req, res) => {
    const { id } = req.params;
    const { observacao, ip_address } = req.body; 

    const fields = [];
    const values = [];
    let queryIndex = 1;

    if (observacao !== undefined) {
        fields.push(`observacao = $${queryIndex++}`);
        values.push(observacao);
    }
    
    // --- CORREÇÃO: Trata o campo de IP corretamente ---
    // Permite que o IP seja definido como nulo se o campo estiver vazio.
    if (ip_address !== undefined) {
        fields.push(`ip_address = $${queryIndex++}`);
        values.push(ip_address === '' ? null : ip_address);
    }

    if (fields.length === 0) {
        return res.status(400).json({ message: "Nenhum campo para atualizar foi fornecido." });
    }

    values.push(id);

    try {
        const updateQuery = `UPDATE routers SET ${fields.join(', ')} WHERE id = $${queryIndex} RETURNING *`;
        const updatedRouter = await pool.query(updateQuery, values);

        if (updatedRouter.rowCount === 0) {
            return res.status(404).json({ message: 'Roteador não encontrado.' });
        }
        res.json({ message: 'Roteador atualizado com sucesso!', router: updatedRouter.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar roteador:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const deleteRouter = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('UPDATE routers SET group_id = NULL WHERE id = $1', [id]);
        const result = await pool.query('DELETE FROM routers WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Roteador não encontrado.' });
        }
        res.json({ message: 'Roteador eliminado com sucesso.' });
    } catch (error) {
        console.error('Erro ao eliminar roteador:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const checkRouterStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const routerResult = await pool.query('SELECT ip_address FROM routers WHERE id = $1', [id]);
        if (routerResult.rowCount === 0) {
            return res.status(404).json({ message: 'Roteador não encontrado.' });
        }
        const ip = routerResult.rows[0].ip_address;
        if (!ip) {
            return res.status(400).json({ message: 'Este roteador não tem um endereço IP configurado.' });
        }
        const pingResult = await ping.promise.probe(ip);
        const newStatus = pingResult.alive ? 'online' : 'offline';
        const updateQuery = 'UPDATE routers SET status = $1, last_seen = NOW() WHERE id = $2 RETURNING status';
        const updateResult = await pool.query(updateQuery, [newStatus, id]);
        res.json({ status: updateResult.rows[0].status });
    } catch (error) {
        console.error(`Erro ao verificar status do roteador ${id}:`, error);
        res.status(500).json({ message: 'Erro interno ao verificar o status.' });
    }
};


// --- Funções de Deteção e Grupos ---
const discoverNewRouters = async (req, res) => {
    try {
        const detectedResult = await pool.query('SELECT DISTINCT router_name FROM userdetails WHERE router_name IS NOT NULL');
        const detectedNames = detectedResult.rows.map(r => r.router_name);
        const registeredResult = await pool.query('SELECT name FROM routers');
        const registeredNames = new Set(registeredResult.rows.map(r => r.name));
        const newRouters = detectedNames.filter(name => !registeredNames.has(name));
        res.json(newRouters);
    } catch (error) {
        console.error('Erro ao detetar novos roteadores:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

const batchAddRouters = async (req, res) => {
    const { routerNames } = req.body;
    if (!routerNames || !Array.isArray(routerNames) || routerNames.length === 0) {
        return res.status(400).json({ message: 'Nenhum nome de roteador foi fornecido.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const query = `
            INSERT INTO routers (name, status) 
            SELECT name, 'offline' 
            FROM unnest($1::text[]) AS name
            ON CONFLICT (name) DO NOTHING;
        `;
        await client.query(query, [routerNames]);
        await client.query('COMMIT');
        res.status(201).json({ message: `${routerNames.length} roteador(es) adicionado(s) com sucesso!` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao adicionar roteadores em massa:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

const getAllRouterGroups = async (req, res) => {
  try {
    const query = `
      SELECT rg.id, rg.name, rg.observacao, COUNT(r.id) as router_count
      FROM router_groups rg
      LEFT JOIN routers r ON rg.id = r.group_id
      GROUP BY rg.id
      ORDER BY rg.name ASC;
    `;
    const allGroups = await pool.query(query);
    res.json(allGroups.rows);
  } catch (error) {
    console.error('Erro ao listar grupos:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

const createRouterGroup = async (req, res) => {
  const { name, observacao, routerIds } = req.body;
  if (!name || !routerIds || !Array.isArray(routerIds) || routerIds.length < 2) {
    return res.status(400).json({ message: "Nome do grupo e pelo menos 2 IDs de roteadores são obrigatórios." });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const checkQuery = 'SELECT id, name FROM routers WHERE id = ANY($1::int[]) AND group_id IS NOT NULL';
    const checkResult = await client.query(checkQuery, [routerIds]);
    if (checkResult.rows.length > 0) {
      const routerNames = checkResult.rows.map(r => r.name).join(', ');
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `Os roteadores ${routerNames} já pertencem a um grupo.` });
    }
    const insertGroupQuery = 'INSERT INTO router_groups (name, observacao) VALUES ($1, $2) RETURNING id';
    const newGroup = await client.query(insertGroupQuery, [name, observacao]);
    const newGroupId = newGroup.rows[0].id;
    const updateRoutersQuery = 'UPDATE routers SET group_id = $1 WHERE id = ANY($2::int[])';
    await client.query(updateRoutersQuery, [newGroupId, routerIds]);
    await client.query('COMMIT');
    res.status(201).json({ message: `Grupo '${name}' criado com sucesso.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  } finally {
    client.release();
  }
};

const updateRouterGroup = async (req, res) => {
    const { id } = req.params;
    const { name, observacao, routerIds } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const updateGroupQuery = 'UPDATE router_groups SET name = $1, observacao = $2 WHERE id = $3';
        await client.query(updateGroupQuery, [name, observacao, id]);
        await client.query('UPDATE routers SET group_id = NULL WHERE group_id = $1', [id]);
        if (routerIds && routerIds.length > 0) {
            const updateRoutersQuery = 'UPDATE routers SET group_id = $1 WHERE id = ANY($2::int[])';
            await client.query(updateRoutersQuery, [id, routerIds]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Grupo atualizado com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};

const deleteRouterGroup = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('UPDATE routers SET group_id = NULL WHERE group_id = $1', [id]);
        await client.query('DELETE FROM router_groups WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.json({ message: 'Grupo eliminado com sucesso.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao eliminar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};


module.exports = {
  getAllRouters,
  updateRouter,
  deleteRouter,
  checkRouterStatus,
  discoverNewRouters,
  batchAddRouters,
  getAllRouterGroups,
  createRouterGroup,
  updateRouterGroup,
  deleteRouterGroup
};

