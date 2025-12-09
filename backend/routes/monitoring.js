const express = require('express');
const router = express.Router();
const { InfluxDB } = require('@influxdata/influxdb-client');
const pool = require('../connection'); // Usa a pool de conexão do PostgreSQL, como o resto do sistema.

// --- Configuração do Cliente InfluxDB ---
// As variáveis vêm do .env que já configurámos
const influxDB = new InfluxDB({ 
    url: process.env.INFLUXDB_URL, 
    token: process.env.INFLUXDB_TOKEN 
});
const queryApi = influxDB.getQueryApi(process.env.INFLUXDB_ORG);
const influxBucket = process.env.INFLUXDB_BUCKET;

/**
 * @route   GET /api/monitoring/router-status
 * @desc    Busca todos os roteadores do PostgreSQL e o seu status de monitorização mais recente da InfluxDB.
 * @access  Private (adicione o seu middleware de autenticação aqui)
 */
router.get('/router-status', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        // 1. Buscar todos os roteadores do PostgreSQL usando uma query direta
        const routerQuery = await pool.query(
            "SELECT id, name, ip_address FROM routers" // CORREÇÃO: Usa a coluna 'ip_address'
        );
        const allRouters = routerQuery.rows;

        if (!allRouters || allRouters.length === 0) {
            return res.json([]);
        }

        // 2. Buscar os últimos dados da InfluxDB para TODOS os roteadores de uma vez
        const fluxQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -10m) // Busca nos últimos 10 minutos para ter uma margem segura
              |> filter(fn: (r) => r._measurement == "system_resource")
              |> filter(fn: (r) => r._field == "uptime_seconds" or r._field == "cpu_load")
              |> last()
              |> pivot(rowKey:["router_host"], columnKey: ["_field"], valueColumn: "_value")
              |> keep(columns: ["router_host", "uptime_seconds", "cpu_load"])
        `;

        const influxData = {};
        await new Promise((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    // Mapeia os dados pelo IP (router_host) para fácil acesso
                    influxData[o.router_host] = o;
                },
                error: reject,
                complete: resolve,
            });
        });

        // 3. Combinar os dados do PostgreSQL com os dados da InfluxDB
        const responseData = allRouters.map(router => {
            const ip = router.ip_address; // CORREÇÃO: Usa a coluna correta
            const liveData = influxData[ip];

            return {
                id: router.id,
                name: router.name,
                ip: ip,
                status: liveData ? 'Online' : 'Offline',
                cpu_load: liveData ? liveData.cpu_load : null,
                uptime_seconds: liveData ? liveData.uptime_seconds : null,
            };
        });

        res.json(responseData);

    } catch (error) {
        console.error('Erro na rota /api/monitoring/router-status:', error);
        res.status(500).send('Erro ao buscar status dos roteadores.');
    }
});

/**
 * @route   GET /api/monitoring/router/:id/cpu-history
 * @desc    Busca o histórico de uso de CPU para um roteador específico.
 * @access  Private
 * @query   range - O período de tempo (ex: '1h', '6h', '24h', '7d'). Padrão: '1h'.
 */
router.get('/router/:id/cpu-history', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        const { id } = req.params;
        const range = req.query.range || '1h'; // Padrão de 1 hora se não for especificado

        // 1. Buscar o IP do roteador no PostgreSQL usando o ID
        const routerQuery = await pool.query(
            "SELECT ip_address FROM routers WHERE id = $1", // CORREÇÃO: Usa a coluna 'ip_address'
            [id]
        );

        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address; // CORREÇÃO: Usa a coluna correta

        // 2. Criar a query Flux para buscar a série temporal
        const fluxQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -${range})
              |> filter(fn: (r) => r._measurement == "system_resource")
              |> filter(fn: (r) => r._field == "cpu_load")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
              |> yield(name: "mean")
        `;

        const data = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    // Formata para o padrão que as bibliotecas de gráfico esperam (x, y)
                    data.push({ x: o._time, y: o._value });
                },
                error: reject,
                complete: resolve,
            });
        });

        res.json(data);
    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/cpu-history:`, error);
        res.status(500).send('Erro ao buscar histórico de CPU.');
    }
});

/**
 * @route   GET /api/monitoring/router/:id/metrics
 * @desc    Busca múltiplas métricas para um roteador específico (CPU, Memória, Tráfego, etc).
 * @access  Private
 * @query   range - O período de tempo (ex: '1h', '6h', '24h', '7d'). Padrão: '24h'.
 */
router.get('/router/:id/metrics', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        const { id } = req.params;
        const range = req.query.range || '24h';

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query(
            "SELECT ip_address, name FROM routers WHERE id = $1",
            [id]
        );

        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }

        const routerIp = routerQuery.rows[0].ip_address;
        const routerName = routerQuery.rows[0].name;

        // 2. Buscar dados de CPU
        const cpuQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -${range})
              |> filter(fn: (r) => r._measurement == "system_resource")
              |> filter(fn: (r) => r._field == "cpu_load")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
        `;

        // 3. Buscar dados de Memória
        const memoryQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -${range})
              |> filter(fn: (r) => r._measurement == "system_resource")
              |> filter(fn: (r) => r._field == "free_memory" or r._field == "total_memory") // CORREÇÃO: Busca campos de memória
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
              |> map(fn: (r) => ({ r with _value: (r.total_memory - r.free_memory) * 100.0 / r.total_memory })) // Calcula o uso em %
              |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
        `;

        // 4. Buscar dados de Tráfego de Rede
        const trafficQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -${range}) 
              |> filter(fn: (r) => r._measurement == "interface_stats") // CORREÇÃO: Usa a measurement correta do agent.js
              |> filter(fn: (r) => r._field == "rx-bits-per-second" or r._field == "tx-bits-per-second")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> group(columns: ["_time", "_start", "_stop"]) // Agrupa para somar RX e TX
              |> sum() // Soma RX e TX para ter o tráfego total
              |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
        `;

        const cpuData = [];
        const memoryData = [];
        const trafficData = [];

        // Executar queries em paralelo
        await Promise.all([
            new Promise((resolve, reject) => {
                queryApi.queryRows(cpuQuery, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        cpuData.push({ x: o._time, y: o._value });
                    },
                    error: reject,
                    complete: resolve,
                });
            }),
            new Promise((resolve, reject) => {
                queryApi.queryRows(memoryQuery, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        memoryData.push({ x: o._time, y: o._value });
                    },
                    error: reject,
                    complete: resolve,
                });
            }),
            new Promise((resolve, reject) => {
                queryApi.queryRows(trafficQuery, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        trafficData.push({ x: o._time, y: o._value });
                    },
                    error: reject,
                    complete: resolve,
                });
            })
        ]);

        // Calcular estatísticas
        const calculateStats = (data) => {
            if (data.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };
            const values = data.map(d => d.y);
            return {
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                current: values[values.length - 1]
            };
        };

        res.json({
            success: true,
            data: {
                routerId: id,
                routerName: routerName,
                routerIp: routerIp,
                cpu: {
                    data: cpuData,
                    stats: calculateStats(cpuData)
                },
                memory: {
                    data: memoryData,
                    stats: calculateStats(memoryData)
                },
                traffic: {
                    data: trafficData,
                    stats: calculateStats(trafficData)
                }
            }
        });
    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/metrics:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar métricas.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/clients
 * @desc    Busca informações sobre clientes conectados (Wi-Fi, DHCP, Hotspot).
 * @access  Private
 */
router.get('/router/:id/clients', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query(
            "SELECT ip_address, name FROM routers WHERE id = $1",
            [id]
        );

        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }

        const routerIp = routerQuery.rows[0].ip_address;
        const routerName = routerQuery.rows[0].name;

        // 2. Buscar clientes DHCP
        const dhcpQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -24h)
              |> filter(fn: (r) => r._measurement == "ip_dhcp_server_lease")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> last()
              |> group(columns: ["_measurement"])
        `;

        const dhcpClients = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(dhcpQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    dhcpClients.push(o);
                },
                error: reject,
                complete: resolve,
            });
        });

        // 3. Buscar clientes Hotspot
        const hotspotQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -24h)
              |> filter(fn: (r) => r._measurement == "hotspot_active")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> group(columns: ["_measurement"])
        `;

        const hotspotClients = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(hotspotQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    hotspotClients.push(o);
                },
                error: reject,
                complete: resolve,
            });
        });

        // 3. Buscar clientes Wi-Fi (wireless registration table)
        const wifiQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -24h)
              |> filter(fn: (r) => r._measurement == "interface_wireless_registration_table")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> last()
              |> group(columns: ["_measurement"])
        `;

        const wifiClients = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(wifiQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    wifiClients.push(o);
                },
                error: reject,
                complete: resolve,
            });
        });

        // 4. Contar clientes por tipo
        const dhcpCount = dhcpClients.length;
        const wifiCount = wifiClients.length;
        const hotspotCount = hotspotClients.length;

        console.log(`[MONITORING] Clientes para roteador ${routerIp}:`, {
            dhcp: dhcpCount,
            wifi: wifiCount,
            hotspot: hotspotCount
        });

        res.json({
            success: true,
            data: {
                routerId: id,
                routerName: routerName,
                routerIp: routerIp,
                clients: {
                    dhcp: {
                        count: dhcpCount,
                        details: dhcpClients
                    },
                    wifi: {
                        count: wifiCount,
                        details: wifiClients
                    },
                    hotspot: {
                        count: hotspotCount,
                        details: hotspotClients
                    },
                    total: dhcpCount + wifiCount + hotspotCount
                }
            }
        });

    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/clients:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar clientes.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/detailed-metrics
 * @desc    Busca métricas detalhadas por interface (Gateway, Wi-Fi, LANs, etc).
 * @access  Private
 * @query   range - O período de tempo. Padrão: '24h'.
 */
router.get('/router/:id/detailed-metrics', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        const { id } = req.params;
        const range = req.query.range || '24h';

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query(
            "SELECT ip_address, name FROM routers WHERE id = $1",
            [id]
        );

        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }

        const routerIp = routerQuery.rows[0].ip_address;
        const routerName = routerQuery.rows[0].name;

        // Função auxiliar para buscar dados de uma métrica
        const fetchMetricData = (measurement, field, filterTag = null, filterValue = null) => {
            return new Promise((resolve, reject) => {
                let query = `
                    from(bucket: "${influxBucket}")
                      |> range(start: -${range})
                      |> filter(fn: (r) => r._measurement == "${measurement}")
                      |> filter(fn: (r) => r._field == "${field}")
                      |> filter(fn: (r) => r.router_host == "${routerIp}")
                `;

                if (filterTag && filterValue) {
                    // [CORREÇÃO] Escapa caracteres especiais (barras invertidas e aspas duplas) no valor do filtro
                    // para prevenir erros de sintaxe na query Flux.
                    const escapedFilterValue = String(filterValue).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                    query += `|> filter(fn: (r) => r.${filterTag} == "${escapedFilterValue}")`;
                }
                query += `|> aggregateWindow(every: 5m, fn: mean, createEmpty: false)`;

                const data = [];
                queryApi.queryRows(query, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        data.push({ x: o._time, y: o._value });
                    },
                    error: reject,
                    complete: () => resolve(data),
                });
            });
        };

        // Função auxiliar para buscar dados de memória com cálculo de percentual
        const fetchMemoryData = () => {
            return new Promise((resolve, reject) => {
                const query = `
                    from(bucket: "${influxBucket}")
                        |> range(start: -${range})
                        |> filter(fn: (r) => r._measurement == "system_resource")
                        |> filter(fn: (r) => r._field == "free_memory" or r._field == "total_memory")
                        |> filter(fn: (r) => r.router_host == "${routerIp}")
                        |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
                        |> map(fn: (r) => ({ r with _value: if exists r.total_memory and exists r.free_memory and r.total_memory > 0 then (float(v: r.total_memory) - float(v: r.free_memory)) / float(v: r.total_memory) * 100.0 else 0.0 }))
                        |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
                `;
                const data = [];
                queryApi.queryRows(query, {
                    next(row, tableMeta) {
                        const o = tableMeta.toObject(row);
                        data.push({ x: o._time, y: o._value });
                    },
                    error: reject,
                    complete: () => resolve(data),
                });
            });
        };

        // Função para calcular estatísticas
        const calculateStats = (data) => {
            if (data.length === 0) return { min: 0, max: 0, avg: 0, current: 0 };
            const values = data.map(d => d.y);
            return {
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                current: values[values.length - 1]
            };
        };

        // Buscar todas as interfaces disponíveis
        // [CORREÇÃO] Usar schema.tagValues para obter nomes de interface de forma mais robusta
        const interfacesQuery = `
            import "influxdata/influxdb/schema"

            schema.tagValues(
              bucket: "${influxBucket}",
              tag: "interface_name",
              predicate: (r) => r._measurement == "interface_stats" and r.router_host == "${routerIp}",
              start: -${range}
            )
        `;

        const interfaces = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(interfacesQuery, {
                next(row, tableMeta) { // Esta função pode não ser chamada se não houver resultados
                    const o = tableMeta.toObject(row);
                    if (o._value) { // schema.tagValues retorna o valor na coluna _value
                        interfaces.push(o._value);
                    }
                },
                error: reject,
                complete: resolve,
            });
        });

        console.log(`[MONITORING] Interfaces encontradas para ${routerIp}: ${interfaces.join(', ')}`);

        // Buscar dados para cada interface
        const interfaceMetrics = {};
        for (const iface of interfaces) {
            const rxData = await fetchMetricData('interface_stats', 'rx_byte', 'interface_name', iface);
            const txData = await fetchMetricData('interface_stats', 'tx_byte', 'interface_name', iface);

            interfaceMetrics[iface] = {
                rx: { data: rxData, stats: calculateStats(rxData) },
                tx: { data: txData, stats: calculateStats(txData) }
            };
        }

        // Buscar métricas do sistema
        const cpuData = await fetchMetricData('system_resource', 'cpu_load');
        const memoryData = await fetchMemoryData(); // CORREÇÃO: Usa a nova função para calcular a porcentagem
        const uptimeData = await fetchMetricData('system_resource', 'uptime_seconds');

        console.log(`[MONITORING] Dados retornados para roteador ${id}:`, {
            routerName,
            routerIp,
            systemMetrics: { cpu: cpuData.length, memory: memoryData.length, uptime: uptimeData.length },
            interfaces: Object.keys(interfaceMetrics)
        });

        res.json({
            success: true,
            data: {
                routerId: id,
                routerName: routerName,
                routerIp: routerIp,
                system: {
                    cpu: { data: cpuData, stats: calculateStats(cpuData) },
                    memory: { data: memoryData, stats: calculateStats(memoryData) },
                    uptime: { data: uptimeData, stats: calculateStats(uptimeData) }
                },
                interfaces: interfaceMetrics
            }
        });
    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/detailed-metrics:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar métricas detalhadas.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/availability
 * @desc    Calcula métricas de disponibilidade (uptime %, quedas, status atual).
 * @access  Private
 */
router.get('/router/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query("SELECT ip_address FROM routers WHERE id = $1", [id]);
        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address;

        // Lógica para determinar o status atual (Online/Offline)
        const statusQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -5m) // Verifica se há dados nos últimos 5 minutos
              |> filter(fn: (r) => r._measurement == "system_resource" and r.router_host == "${routerIp}")
              |> first()
        `;

        // Função para calcular a porcentagem de uptime para um dado período
        const calculateUptimePercent = (range) => {
            return new Promise((resolve, reject) => {
                // A cada 5 minutos, verifica se houve pelo menos 1 ponto de dado.
                // Se sim, a janela é "online" (1), senão é "offline" (0).
                // CORREÇÃO DEFINITIVA: A query agora apenas CONTA as janelas online. O cálculo da % será feito em JS.
                const query = `
                    from(bucket: "${influxBucket}")
                      |> range(start: -${range}h)
                      |> filter(fn: (r) => r._measurement == "system_resource" and r.router_host == "${routerIp}")
                      |> aggregateWindow(every: 5m, fn: count)
                      |> filter(fn: (r) => r._value > 0)
                      |> count()
                `;

                queryApi.queryRows(query, {
                    next: (row, tableMeta) => resolve(tableMeta.toObject(row)._value || 0),
                    error: reject,
                    complete: () => resolve(0), // Retorna 0 se não houver dados
                });
            });
        };

        // Função para contar as quedas (períodos offline) em 24h
        const countOfflineEvents = () => {
            return new Promise((resolve, reject) => {
                // Cria janelas de 5 minutos e preenche as vazias com 'null'.
                // Conta quantas vezes um estado 'online' é seguido por um 'offline'.
                const query = `
                    data = from(bucket: "${influxBucket}")
                      |> range(start: -24h)
                      |> filter(fn: (r) => r._measurement == "system_resource" and r.router_host == "${routerIp}")
                      |> aggregateWindow(every: 5m, fn: count, createEmpty: true)
                      |> map(fn: (r) => ({ r with is_online: if exists r._value and r._value > 0 then 1 else 0 }))
                      
                    data
                      |> difference(columns: ["is_online"])
                      |> filter(fn: (r) => r.is_online == -1) // Transição de online (1) para offline (0)
                      |> count()
                      |> yield(name: "offline_events")
                `;
                queryApi.queryRows(query, {
                    next: (row, tableMeta) => resolve(tableMeta.toObject(row)._value || 0),
                    error: reject,
                    complete: () => resolve(0),
                });
            });
        };

        // Executa todas as consultas em paralelo
        const [statusResult, uptime7d, uptime30d, offlineEvents24h] = await Promise.all([
            new Promise(resolve => queryApi.queryRows(statusQuery, { next: () => resolve('Online'), error: (err) => { console.error("Erro na query de status:", err); resolve('Offline'); }, complete: () => resolve('Offline') })),
            calculateUptimePercent(7 * 24),   // 7 dias em horas
            calculateUptimePercent(30 * 24),  // 30 dias em horas
            countOfflineEvents()
        ]);

        // CORREÇÃO: Cálculo da porcentagem movido para o JavaScript
        const totalWindows7d = 7 * 24 * 12;
        const totalWindows30d = 30 * 24 * 12;
        const percent7d = totalWindows7d > 0 ? (uptime7d / totalWindows7d) * 100 : 0;
        const percent30d = totalWindows30d > 0 ? (uptime30d / totalWindows30d) * 100 : 0;

        res.json({
            success: true,
            data: {
                status: statusResult,
                last24h: {
                    offline_events: offlineEvents24h
                },
                last7d: {
                    uptime_percent: percent7d.toFixed(2)
                },
                last30d: {
                    uptime_percent: percent30d.toFixed(2)
                }
            }
        });

    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/availability:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados de disponibilidade.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/wifi-analytics
 * @desc    Busca análises detalhadas sobre clientes Wi-Fi (atuais, 1h, 7d, 30d).
 * @access  Private
 */
router.get('/router/:id/wifi-analytics', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query("SELECT ip_address FROM routers WHERE id = $1", [id]);
        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address;

        // Função para contar clientes únicos em um período
        const countUniqueClients = (range) => {
            return new Promise((resolve, reject) => {
                const query = `
                    from(bucket: "${influxBucket}")
                      |> range(start: -${range})
                      |> filter(fn: (r) => r._measurement == "interface_wireless_registration_table")
                      |> filter(fn: (r) => r.router_host == "${routerIp}")
                      |> keep(columns: ["mac_address"])
                      |> distinct(column: "mac_address")
                      |> count()
                `;
                queryApi.queryRows(query, {
                    next: (row, tableMeta) => resolve(tableMeta.toObject(row)._value || 0),
                    error: reject,
                    complete: () => resolve(0),
                });
            });
        };

        // Contagem de clientes atualmente conectados (nos últimos 5 minutos)
        const currentClientsPromise = countUniqueClients('5m');
        // Contagem de clientes únicos na última hora
        const last1hPromise = countUniqueClients('1h');
        // Contagem de clientes únicos nos últimos 7 dias
        const last7dPromise = countUniqueClients('7d');
        // Contagem de clientes únicos nos últimos 30 dias
        const last30dPromise = countUniqueClients('30d');

        // Executa todas as consultas em paralelo
        const [
            currentCount,
            count1h,
            count7d,
            count30d
        ] = await Promise.all([
            currentClientsPromise,
            last1hPromise,
            last7dPromise,
            last30dPromise
        ]);

        res.json({
            success: true,
            data: {
                current: currentCount,
                last_1h: count1h,
                last_7d: count7d,
                last_30d: count30d
            }
        });

    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/wifi-analytics:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar análise de clientes Wi-Fi.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/dhcp-analytics
 * @desc    Busca análises detalhadas sobre clientes DHCP.
 * @access  Private
 */
router.get('/router/:id/dhcp-analytics', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query("SELECT ip_address FROM routers WHERE id = $1", [id]);
        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address;

        // Query para contar clientes DHCP ativos e agrupá-los por servidor
        const dhcpAnalyticsQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -10m) // Busca recente para dados de estado
              |> filter(fn: (r) => r._measurement == "ip_dhcp_server_lease")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> filter(fn: (r) => r.status == "bound") // Apenas clientes conectados
              |> last()
              |> group(columns: ["server"])
              |> count(column: "mac_address")
              |> group() // Remove o agrupamento para somar o total
        `;

        const results = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(dhcpAnalyticsQuery, {
                next: (row, tableMeta) => {
                    results.push(tableMeta.toObject(row));
                },
                error: reject,
                complete: resolve,
            });
        });

        // Processa os resultados para o formato do gráfico
        const totalCount = results.reduce((sum, item) => sum + item._value, 0);
        const chartData = {
            labels: results.map(item => item.server || 'Desconhecido'),
            series: results.map(item => item._value)
        };

        res.json({
            success: true,
            data: {
                current: totalCount,
                distribution: chartData
            }
        });

    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/dhcp-analytics:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar análise de clientes DHCP.' });
    }
});


/**
 * @route   GET /api/monitoring/router/:id/hotspot-analytics
 * @desc    Busca análises detalhadas sobre clientes Hotspot.
 * @access  Private
 */
router.get('/router/:id/hotspot-analytics', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query("SELECT ip_address FROM routers WHERE id = $1", [id]);
        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address;

        // Função reutilizável para contar clientes únicos do hotspot em um período
        const countUniqueHotspotClients = (range) => {
            return new Promise((resolve, reject) => {
                const query = `
                    from(bucket: "${influxBucket}")
                      |> range(start: -${range})
                      |> filter(fn: (r) => r._measurement == "hotspot_active")
                      |> filter(fn: (r) => r.router_host == "${routerIp}")
                      |> keep(columns: ["mac_address"])
                      |> distinct(column: "mac_address")
                      |> count()
                `;
                queryApi.queryRows(query, {
                    next: (row, tableMeta) => resolve(tableMeta.toObject(row)._value || 0),
                    error: reject,
                    complete: () => resolve(0),
                });
            });
        };

        // Executa todas as consultas em paralelo para máxima eficiência
        const [
            currentCount,
            count1h,
            count24h,
            count7d,
            count15d,
            count30d
        ] = await Promise.all([
            countUniqueHotspotClients('5m'),   // "Agora" são os clientes nos últimos 5 minutos
            countUniqueHotspotClients('1h'),
            countUniqueHotspotClients('24h'),
            countUniqueHotspotClients('7d'),
            countUniqueHotspotClients('15d'),
            countUniqueHotspotClients('30d')
        ]);

        res.json({
            success: true,
            data: {
                current: currentCount,
                last_1h: count1h,
                last_24h: count24h,
                last_7d: count7d,
                last_15d: count15d,
                last_30d: count30d
            }
        });

    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/hotspot-analytics:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar análise de clientes Hotspot.' });
    }
});

/**
 * @route   GET /api/monitoring/all-routers-status
 * @desc    [NOVO] Busca um resumo do estado atual de todos os roteadores para o dashboard NOC.
 * @access  Private
 */
router.get('/all-routers-status', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        // 1. Buscar todos os roteadores ativos do PostgreSQL
        const routerQuery = await pool.query(
            "SELECT id, name, ip_address FROM routers" // Busca todos os roteadores; o status será determinado pelo InfluxDB
        );
        const allRouters = routerQuery.rows;

        if (!allRouters || allRouters.length === 0) {
            return res.json([]);
        }

        // 2. Buscar os últimos dados da InfluxDB para TODOS os roteadores de uma vez
        const fluxQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -5m) // Busca nos últimos 5 minutos, conforme o guia
              |> filter(fn: (r) => r._measurement == "system_resource")
              |> filter(fn: (r) => r._field == "uptime_seconds" or r._field == "cpu_load")
              |> last()
              |> pivot(rowKey:["router_host"], columnKey: ["_field"], valueColumn: "_value")
              |> keep(columns: ["router_host", "uptime_seconds", "cpu_load"])
        `;

        const influxData = {};
        await new Promise((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    influxData[o.router_host] = o;
                },
                error: reject,
                complete: resolve,
            });
        });

        // 3. Combinar os dados do PostgreSQL com os dados da InfluxDB
        const responseData = allRouters.map(router => {
            const ip = router.ip_address;
            const liveData = influxData[ip];

            return { id: router.id, name: router.name, ip: ip, status: liveData ? 'online' : 'offline', cpu_load: liveData ? liveData.cpu_load : null, uptime_seconds: liveData ? liveData.uptime_seconds : null, };
        });

        res.json(responseData);

    } catch (error) {
        console.error('Erro na rota /api/monitoring/all-routers-status:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar status de todos os roteadores.' });
    }
});

/**
 * @route   GET /api/monitoring/router/:id/interface-traffic
 * @desc    [NOVO] Busca o histórico de tráfego (RX/TX) para uma interface específica.
 * @access  Private
 * @query   interface - O nome da interface (obrigatório).
 * @query   range - O período de tempo (ex: '15m', '1h'). Padrão: '15m'.
 */
router.get('/router/:id/interface-traffic', /* seuMiddlewareDeAuth, */ async (req, res) => {
    try {
        const { id } = req.params;
        const { interface: interfaceName, range = '15m' } = req.query;

        if (!interfaceName) {
            return res.status(400).json({ success: false, message: 'O nome da interface é obrigatório.' });
        }

        // 1. Buscar o IP do roteador no PostgreSQL
        const routerQuery = await pool.query("SELECT ip_address FROM routers WHERE id = $1", [id]);
        if (routerQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Roteador não encontrado.' });
        }
        const routerIp = routerQuery.rows[0].ip_address;

        // 2. Query para buscar dados de RX e TX
        const trafficQuery = `
            from(bucket: "${influxBucket}")
              |> range(start: -${range})
              |> filter(fn: (r) => r._measurement == "interface_stats")
              |> filter(fn: (r) => r.router_host == "${routerIp}")
              |> filter(fn: (r) => r.interface_name == "${decodeURIComponent(interfaceName)}")
              |> filter(fn: (r) => r._field == "rx_bits_per_second" or r._field == "tx_bits_per_second")
              |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
              |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        `;

        const data = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(trafficQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    data.push({ time: o._time, rx: o['rx_bits_per_second'], tx: o['tx_bits_per_second'] });
                },
                error: reject,
                complete: resolve,
            });
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error(`Erro na rota /api/monitoring/router/${req.params.id}/interface-traffic:`, error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados de tráfego da interface.' });
    }
});

module.exports = router;
