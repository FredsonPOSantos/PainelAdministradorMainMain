// Ficheiro: controllers/routerController.js
const pool = require('../connection');
const ping = require('ping');
const { logAction } = require('../services/auditLogService');
// [NOVO] Adicionar dependências e configuração para InfluxDB
const { InfluxDB } = require('@influxdata/influxdb-client');
require('dotenv').config();

// [NOVO] Configuração do InfluxDB a partir de variáveis de ambiente
const influxUrl = process.env.INFLUXDB_URL;
const influxToken = process.env.INFLUXDB_TOKEN;
const influxOrg = process.env.INFLUXDB_ORG;
const influxBucket = process.env.INFLUXDB_BUCKET;

let queryApi = null;
if (influxUrl && influxToken && influxOrg && influxBucket) {
    const influxDB = new InfluxDB({ url: influxUrl, token: influxToken });
    queryApi = influxDB.getQueryApi(influxOrg);
    console.log('Conexão com InfluxDB estabelecida para métricas em tempo real.');
} else {
    console.warn('Variáveis de ambiente da InfluxDB não configuradas. As métricas em tempo real não estarão disponíveis.');
}
// --- Funções de Roteadores Individuais ---

const getAllRouters = async (req, res) => {
  // [MODIFICADO] Esta rota agora é usada apenas para a lista simples na gestão.
  // A nova rota /status é usada para a página de monitoramento.
  try {
    const allRouters = await pool.query('SELECT id, name, status, observacao, group_id, ip_address FROM routers ORDER BY name ASC');
    res.json(allRouters.rows);
  } catch (error) {
    console.error('Erro ao listar roteadores:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

/**
 * [MODIFICADO] Obtém o status detalhado de todos os roteadores, buscando métricas em tempo real do InfluxDB.
 */
const getRoutersStatus = async (req, res) => {
    try {
        // 1. Obter dados base dos roteadores do PostgreSQL
        const pgQuery = `
            SELECT 
                r.id,
                r.name,
                r.ip_address AS ip,
                r.status,
                rg.name AS group_name
            FROM routers r
            LEFT JOIN router_groups rg ON r.group_id = rg.id
            ORDER BY r.name ASC
        `;
        const { rows: routers } = await pool.query(pgQuery);

        // 2. Enriquecer cada roteador com dados de ping e InfluxDB em paralelo
        const enrichedRouters = await Promise.all(routers.map(async (router) => {
            let latency = null;
            let connected_clients = 0;
            let interface_traffic = {};
            let interfaces = [];
            let default_interface = null;

            // Ping para obter latência real
            // [MODIFICADO] Adicionado .trim() para remover espaços em branco do IP vindo do banco de dados.
            const cleanIp = router.ip ? router.ip.trim() : null;

            if (cleanIp) {
                try {
                    const pingResult = await ping.promise.probe(cleanIp, { timeout: 2 });
                    latency = pingResult.alive ? Math.round(pingResult.time) : null;
                } catch (e) {
                    latency = null;
                }
            }

            // Se o InfluxDB estiver configurado, buscar métricas
            if (queryApi && cleanIp) { // [MODIFICADO] Apenas executa se houver um IP limpo.
                try {
                    // [MODIFICADO] Adiciona queries para múltiplas fontes de contagem de clientes
                    let hotspot_clients = 0;
                    let dhcp_clients = 0;
                    let wifi_clients = 0;

                    // Query para clientes do Hotspot
                    const hotspotQuery = `
                        from(bucket: "${influxBucket}")
                          |> range(start: -10m)
                          |> filter(fn: (r) => r._measurement == "hotspot_active" and r.router_host == "${cleanIp}")
                          |> group(columns: ["mac_address"])
                          |> last(column: "_time") // Pega o registo mais recente para cada MAC
                          |> group() // Desagrupa para contar
                          |> count() // [CORRIGIDO] A função count() não aceita parâmetros de coluna.
                    `;
                    const hotspotResult = await queryApi.collectRows(hotspotQuery);
                    if (hotspotResult.length > 0) {
                        hotspot_clients = hotspotResult[0]._value || 0;
                    }

                    // Query para clientes DHCP
                    const dhcpQuery = `
                        from(bucket: "${influxBucket}")
                          |> range(start: -24h)
                          |> filter(fn: (r) => r._measurement == "ip_dhcp_server_lease" and r.router_host == "${cleanIp}")
                          |> filter(fn: (r) => r._field == "status")
                          |> group(columns: ["mac_address"])
                          |> last()
                          |> filter(fn: (r) => r._value == "bound")
                          |> group()
                          |> count()
                    `;
                    const dhcpResult = await queryApi.collectRows(dhcpQuery);
                    if (dhcpResult.length > 0) {
                        dhcp_clients = dhcpResult[0]._value || 0;
                    }

                    // Query para clientes Wi-Fi
                    const wifiQuery = `
                        from(bucket: "${influxBucket}")
                          |> range(start: -10m)
                          |> filter(fn: (r) => r._measurement == "interface_wireless_registration_table" and r.router_host == "${cleanIp}")
                          |> group(columns: ["mac_address"])
                          |> last(column: "_time") // Pega o registo mais recente para cada MAC
                          |> group() // Desagrupa para contar
                          |> count() // [CORRIGIDO] A função count() não aceita parâmetros de coluna.
                    `;
                    const wifiResult = await queryApi.collectRows(wifiQuery);
                    if (wifiResult.length > 0) {
                        wifi_clients = wifiResult[0]._value || 0;
                    }

                    // [NOVO] Log de depuração para contagem de clientes
                    console.log(`[CLIENT-COUNT-DEBUG] Roteador: ${router.name}, Hotspot: ${hotspot_clients}, DHCP: ${dhcp_clients}, Wi-Fi: ${wifi_clients}`);

                    // [MODIFICADO] A contagem de clientes agora prioriza os usuários ativos do hotspot, com fallback para Wi-Fi e DHCP.
                    connected_clients = hotspot_clients > 0 ? hotspot_clients : (wifi_clients > 0 ? wifi_clients : dhcp_clients);

                    // Query para tráfego de todas as interfaces
                    const trafficQuery = `
                        from(bucket: "${influxBucket}")
                          |> range(start: -1m)
                          |> filter(fn: (r) => r._measurement == "interface_stats" and r.router_host == "${cleanIp}")
                          |> filter(fn: (r) => r._field == "rx_bits_per_second" or r._field == "tx_bits_per_second")
                          |> group(columns: ["interface_name"]) |> last() |> group()`;
                    const trafficResult = await queryApi.collectRows(trafficQuery);
                    
                    const trafficData = {};
                    trafficResult.forEach(row => {
                        const ifaceName = row.interface_name;
                        if (!trafficData[ifaceName]) trafficData[ifaceName] = 0;
                        trafficData[ifaceName] += row._value;
                    });
                    interface_traffic = trafficData;

                    // [NOVO] Lógica para determinar uma interface padrão para exibir no gráfico.
                    if (Object.keys(interface_traffic).length > 0) {
                        // 1. Prioriza interfaces com nomes comuns de WAN/Gateway.
                        const wanInterface = Object.keys(interface_traffic).find(iface => /wan|gateway/i.test(iface));
                        if (wanInterface) {
                            default_interface = wanInterface;
                        } else {
                            // 2. Se não encontrar, escolhe a interface com o maior tráfego.
                            default_interface = Object.entries(interface_traffic).reduce((a, b) => a[1] > b[1] ? a : b)[0];
                        }
                    }
                    // [NOVO] Log para depuração da interface padrão
                    console.log(`[ROUTER-STATUS-DEBUG] Roteador: ${router.name}, IP: ${cleanIp}, Interface Padrão Escolhida: ${default_interface}`);

                    // Query para obter a lista de interfaces existentes
                    // [CORRIGIDO] Usando `schema.tagValues` e o predicado correto, exatamente como funciona em `monitoring.js`.
                    const interfaceListQuery = `
                        import "influxdata/influxdb/schema"
                        schema.tagValues(
                            bucket: "${influxBucket}",
                            tag: "interface_name",
                            start: -24h,
                            predicate: (r) => r._measurement == "interface_stats" and r.router_host == "${cleanIp}"
                        )`;
                    const interfaceResult = await queryApi.collectRows(interfaceListQuery);
                    interfaces = interfaceResult.map(row => ({ name: row._value }));

                } catch (influxError) {
                    console.error(`Erro ao consultar InfluxDB para o roteador ${router.name} (IP: ${cleanIp}):`, influxError);
                }
            }

            return {
                ...router,
                latency,
                connected_clients,
                interface_traffic, // Objeto com tráfego por interface
                interfaces: interfaces.length > 0 ? interfaces : [], // Lista real de interfaces
                default_interface: default_interface, // [NOVO] Sugestão de interface padrão
                bandwidth_limit: 10000000, // Limite simulado (10 Mbps)
            };
        }));

        // [NOVO] 3. Ordena os resultados antes de enviar para o frontend.
        // Ordem: 1. Online, 2. Warning (Latência Alta), 3. Offline.
        // Desempate por nome.
        enrichedRouters.sort((a, b) => {
            const getSortOrder = (r) => {
                if (r.status === 'online') {
                    // O frontend usa 150ms como limite para 'warning'
                    return (r.latency !== null && r.latency > 150) ? 2 : 1;
                }
                return 3; // 'offline'
            };

            const orderA = getSortOrder(a);
            const orderB = getSortOrder(b);

            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a.name.localeCompare(b.name);
        });

        res.json(enrichedRouters);
    } catch (error) {
        console.error('Erro ao obter status dos roteadores:', error);
        res.status(500).json({ message: "Erro interno do servidor ao obter status dos roteadores." });
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

        await logAction({
            req,
            action: 'ROUTER_UPDATE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" atualizou o roteador "${updatedRouter.rows[0].name}".`,
            target_type: 'router',
            target_id: id
        });

        res.json({ message: 'Roteador atualizado com sucesso!', router: updatedRouter.rows[0] });
    } catch (error) {
        await logAction({
            req,
            action: 'ROUTER_UPDATE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar roteador com ID "${id}". Erro: ${error.message}`,
            target_type: 'router',
            target_id: id,
            details: { error: error.message }
        });

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

        await logAction({
            req,
            action: 'ROUTER_DELETE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" eliminou o roteador com ID ${id}.`,
            target_type: 'router',
            target_id: id
        });

        res.json({ message: 'Roteador eliminado com sucesso.' });
    } catch (error) {
        await logAction({
            req,
            action: 'ROUTER_DELETE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao eliminar roteador com ID "${id}". Erro: ${error.message}`,
            target_type: 'router',
            target_id: id,
            details: { error: error.message }
        });

        console.error('Erro ao eliminar roteador:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

/**
 * [NOVO] Exclui um roteador permanentemente, limpando seu nome da tabela `userdetails`.
 * Requer a permissão 'routers.individual.delete_permanent'.
 */
const deleteRouterPermanently = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obter o nome do roteador antes de o excluir
        const routerQuery = await client.query('SELECT name FROM routers WHERE id = $1', [id]);
        if (routerQuery.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Roteador não encontrado.' });
        }
        const routerName = routerQuery.rows[0].name;

        // 2. Atualizar a tabela 'userdetails' para remover a referência ao nome do roteador
        await client.query('UPDATE userdetails SET router_name = NULL WHERE router_name = $1', [routerName]);

        // 3. Excluir o roteador da tabela 'routers'
        await client.query('DELETE FROM routers WHERE id = $1', [id]);

        await client.query('COMMIT');

        await logAction({
            req,
            action: 'ROUTER_PERMANENT_DELETE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" excluiu permanentemente o roteador "${routerName}" (ID: ${id}).`,
            target_type: 'router',
            target_id: id
        });

        res.json({ message: `Roteador "${routerName}" excluído permanentemente com sucesso.` });
    } catch (error) {
        await client.query('ROLLBACK');
        await logAction({
            req,
            action: 'ROUTER_PERMANENT_DELETE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao excluir permanentemente o roteador com ID "${id}". Erro: ${error.message}`,
            target_type: 'router',
            target_id: id,
            details: { error: error.message }
        });
        console.error('Erro ao excluir roteador permanentemente:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
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
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const detectedResult = await client.query('SELECT DISTINCT router_name FROM userdetails WHERE router_name IS NOT NULL');
        const detectedNames = detectedResult.rows.map(r => r.router_name);
        
        const registeredResult = await client.query('SELECT name FROM routers');
        const registeredNames = new Set(registeredResult.rows.map(r => r.name));
        
        const newRouters = detectedNames.filter(name => !registeredNames.has(name));

        // [NOVO] Se encontrar novos roteadores, cria notificações para admins
        if (newRouters.length > 0) {
            const adminUsers = await client.query("SELECT id FROM admin_users WHERE role IN ('master', 'gestao')");
            
            for (const routerName of newRouters) {
                const notificationMessage = `Novo roteador detetado: "${routerName}". Adicione-o na página de Roteadores.`;
                
                for (const admin of adminUsers.rows) {
                    // Evita notificações duplicadas para o mesmo roteador/usuário
                    await client.query(`
                        INSERT INTO notifications (user_id, type, message, is_read)
                        SELECT $1, 'new_router', $2, false
                        WHERE NOT EXISTS (
                            SELECT 1 FROM notifications 
                            WHERE user_id = $1 AND message = $2 AND is_read = false
                        );
                    `, [admin.id, notificationMessage]);
                }
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, data: newRouters });
    } catch (error) {
        console.error('Erro ao detetar novos roteadores:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        // [CORRIGIDO] Garante que a conexão com o banco de dados seja sempre liberada
        if (client) client.release();
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

        await logAction({
            req,
            action: 'ROUTER_BATCH_ADD',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" adicionou ${routerNames.length} roteador(es) em massa.`,
            target_type: 'router',
            details: { routerNames: routerNames }
        });

        res.status(201).json({ message: `${routerNames.length} roteador(es) adicionado(s) com sucesso!` });
    } catch (error) {
        await client.query('ROLLBACK');

        await logAction({
            req,
            action: 'ROUTER_BATCH_ADD_FAILURE',
            status: 'FAILURE',
            description: `Falha ao adicionar roteadores em massa. Erro: ${error.message}`,
            target_type: 'router',
            details: { error: error.message }
        });

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
  if (!name || !routerIds || !Array.isArray(routerIds)) {
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

    await logAction({
        req,
        action: 'ROUTER_GROUP_CREATE',
        status: 'SUCCESS',
        description: `Utilizador "${req.user.email}" criou o grupo de roteadores "${name}".`,
        target_type: 'router_group',
        target_id: newGroupId
    });

    res.status(201).json({ message: `Grupo '${name}' criado com sucesso.` });
  } catch (error) {
    await client.query('ROLLBACK');

    await logAction({
        req,
        action: 'ROUTER_GROUP_CREATE_FAILURE',
        status: 'FAILURE',
        description: `Falha ao criar grupo de roteadores com nome "${name}". Erro: ${error.message}`,
        target_type: 'router_group',
        details: { error: error.message }
    });

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

        await logAction({
            req,
            action: 'ROUTER_GROUP_UPDATE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" atualizou o grupo de roteadores "${name}".`,
            target_type: 'router_group',
            target_id: id
        });

        res.json({ message: 'Grupo atualizado com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK');

        await logAction({
            req,
            action: 'ROUTER_GROUP_UPDATE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao atualizar grupo de roteadores com ID "${id}". Erro: ${error.message}`,
            target_type: 'router_group',
            target_id: id,
            details: { error: error.message }
        });

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

        await logAction({
            req,
            action: 'ROUTER_GROUP_DELETE',
            status: 'SUCCESS',
            description: `Utilizador "${req.user.email}" eliminou o grupo de roteadores com ID ${id}.`,
            target_type: 'router_group',
            target_id: id
        });

        res.json({ message: 'Grupo eliminado com sucesso.' });
    } catch (error) {
        await client.query('ROLLBACK');

        await logAction({
            req,
            action: 'ROUTER_GROUP_DELETE_FAILURE',
            status: 'FAILURE',
            description: `Falha ao eliminar grupo de roteadores com ID "${id}". Erro: ${error.message}`,
            target_type: 'router_group',
            target_id: id,
            details: { error: error.message }
        });

        console.error('Erro ao eliminar grupo:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    } finally {
        client.release();
    }
};


module.exports = {
  getRoutersStatus, // Exporta a nova função
  getAllRouters,
  updateRouter,
  deleteRouter,
  deleteRouterPermanently, // Exporta a nova função
  checkRouterStatus,
  discoverNewRouters,
  batchAddRouters,
  getAllRouterGroups,
  createRouterGroup,
  updateRouterGroup,
  deleteRouterGroup
};
