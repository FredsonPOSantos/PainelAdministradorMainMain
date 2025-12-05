// Ficheiro: frontend/js/router_dashboard.js
// Dashboard de Roteador com Cards Interativos

document.addEventListener('DOMContentLoaded', () => {
    // ===== VARIÁVEIS GLOBAIS =====
    const routerId = window.location.hash.substring(1);
    let currentRange = '1h';
    let metricsData = {};
    let expandedChartInstance = null;
    let currentExpandedMetric = null;
    let currentChartType = 'both'; // 'rx', 'tx', 'both'
    let currentChartVisualization = 'area'; // 'area', 'bar', 'line'

    // ===== VALIDAÇÃO INICIAL =====
    if (!routerId || isNaN(routerId)) {
        document.getElementById('routerNameTitle').textContent = 'ID do Roteador Inválido';
        return;
    }

    // ===== INICIALIZAÇÃO =====
    loadMetrics(currentRange);
    setupEventListeners();

    // ===== FUNÇÕES PRINCIPAIS =====

    /**
     * Carrega as métricas da API
     */
    async function loadMetrics(range) {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/detailed-metrics?range=${range}`);

            let apiData = response.data;
            if (apiData && apiData.data) {
                apiData = apiData.data;
            }

            if (!apiData) {
                throw new Error('Dados vazios retornados da API');
            }

            metricsData = apiData;

            // Atualizar header
            document.getElementById('routerNameTitle').textContent = metricsData.routerName || 'Roteador Desconhecido';
            document.getElementById('routerIpDisplay').textContent = `IP: ${metricsData.routerIp || 'Desconhecido'}`;

            // Atualizar cards
            updateCards();

        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Atualiza os cards com os dados carregados
     */
    function updateCards() {
        // Sistema
        if (metricsData.system) {
            updateCardStats('cpu', metricsData.system.cpu);
            updateCardStats('memory', metricsData.system.memory);
            updateCardStats('uptime', metricsData.system.uptime);
        }

        // Interfaces
        if (metricsData.interfaces) {
            renderInterfaceCards();
        }

        // Carregar dados de clientes
        loadClientsData();

        // NOVO: Carregar análise de clientes Wi-Fi
        loadWifiAnalytics();

        // NOVO: Carregar análise de clientes DHCP
        loadDhcpAnalytics();

        // NOVO: Carregar análise de clientes Hotspot
        loadHotspotAnalytics();

        // NOVO: Carregar dados de disponibilidade
        loadAvailabilityData();
    }

    /**
     * Carrega dados de clientes (Wi-Fi e DHCP)
     */
    async function loadClientsData() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/clients`);

            let apiData = response.data;
            if (apiData && apiData.data) {
                apiData = apiData.data;
            }

            if (apiData && apiData.clients) {
                // Armazenar dados para exibição no modal
                metricsData.wifiClients = apiData.clients.wifi?.details || [];
                metricsData.dhcpClients = apiData.clients.dhcp?.details || [];
                metricsData.hotspotClients = apiData.clients.hotspot?.details || [];
            }
        } catch (error) {
            console.error('Erro ao carregar dados de clientes:', error);
        }
    }

    /**
     * NOVO: Carrega e exibe os dados de disponibilidade (uptime)
     */
    async function loadAvailabilityData() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/availability`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const availability = response.data.data;
            
            const statusEl = document.getElementById('uptime-status');
            const offlineEventsEl = document.getElementById('uptime-offline-events');
            const uptime7dEl = document.getElementById('uptime-7d');
            const uptime30dEl = document.getElementById('uptime-30d');

            if (statusEl) {
                statusEl.textContent = availability.status;
                statusEl.className = `stat-value status-${availability.status.toLowerCase()}`;
            }
            if (offlineEventsEl) {
                offlineEventsEl.textContent = availability.last24h.offline_events;
            }
            if (uptime7dEl) {
                uptime7dEl.textContent = `${availability.last7d.uptime_percent}%`;
            }
            if (uptime30dEl) {
                uptime30dEl.textContent = `${availability.last30d.uptime_percent}%`;
            }

        } catch (error) {
            console.error('Erro ao carregar dados de disponibilidade:', error);
            // Lidar com o estado de erro na UI, se necessário
        }
    }

    /**
     * NOVO: Carrega e exibe a análise de clientes Wi-Fi
     */
    async function loadWifiAnalytics() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/wifi-analytics`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const wifiData = response.data.data;
            
            // Armazena os dados para o gráfico de pizza
            metricsData.wifiAnalytics = wifiData;

            // Atualiza o card
            document.getElementById('wifi-clients-count').textContent = wifiData.current;
            document.getElementById('wifi-clients-1h').textContent = wifiData.last_1h;
            document.getElementById('wifi-clients-7d').textContent = wifiData.last_7d;
            document.getElementById('wifi-clients-30d').textContent = wifiData.last_30d;

        } catch (error) {
            console.error('Erro ao carregar análise Wi-Fi:', error);
            document.getElementById('wifi-clients-count').textContent = 'Erro';
            // Limpar outros campos se necessário
        }
    }

    /**
     * NOVO: Carrega e exibe a análise de clientes DHCP
     */
    async function loadDhcpAnalytics() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/dhcp-analytics`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const dhcpData = response.data.data;
            
            // Armazena os dados para o gráfico
            metricsData.dhcpAnalytics = dhcpData;

            // Atualiza o card
            document.getElementById('dhcp-clients-count').textContent = dhcpData.current;

            // Mostra uma breve distribuição no card
            const distributionEl = document.getElementById('dhcp-clients-distribution');
            if (distributionEl && dhcpData.distribution.labels.length > 0) {
                distributionEl.textContent = dhcpData.distribution.labels.map((label, index) => 
                    `${label}: ${dhcpData.distribution.series[index]}`
                ).join(' | ');
            }

        } catch (error) {
            console.error('Erro ao carregar análise DHCP:', error);
            document.getElementById('dhcp-clients-count').textContent = 'Erro';
        }
    }

    /**
     * NOVO: Carrega e exibe a análise de clientes Hotspot
     */
    async function loadHotspotAnalytics() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/hotspot-analytics`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const hotspotData = response.data.data;
            
            // Armazena os dados para o gráfico
            metricsData.hotspotAnalytics = hotspotData;

            // Atualiza o card
            document.getElementById('hotspot-clients-count').textContent = hotspotData.current;
            document.getElementById('hotspot-clients-1h').textContent = hotspotData.last_1h;
            document.getElementById('hotspot-clients-24h').textContent = hotspotData.last_24h;
            document.getElementById('hotspot-clients-7d').textContent = hotspotData.last_7d;
            // O de 15 dias não tem campo no card, mas será usado no gráfico
            document.getElementById('hotspot-clients-30d').textContent = hotspotData.last_30d;

        } catch (error) {
            console.error('Erro ao carregar análise Hotspot:', error);
            document.getElementById('hotspot-clients-count').textContent = 'Erro';
            // Limpar outros campos se necessário
        }
    }


    /**
     * Atualiza as estatísticas de um card
     */
    function updateCardStats(metric, data) {
        if (!data || !data.stats) return;

        const stats = data.stats;
        const minEl = document.getElementById(`${metric}-min`);
        const maxEl = document.getElementById(`${metric}-max`);
        const avgEl = document.getElementById(`${metric}-avg`);

        if (minEl) minEl.textContent = formatValue(stats.min, metric);
        if (maxEl) maxEl.textContent = formatValue(stats.max, metric);
        if (avgEl) avgEl.textContent = formatValue(stats.avg, metric);
    }

    /**
     * Formata valores de acordo com o tipo de métrica
     */
    function formatValue(value, metric) {
        if (value === undefined || value === null) return '-';

        switch (metric) {
            case 'cpu':
            case 'memory':
                return value.toFixed(2) + '%';
            case 'uptime':
                return formatUptime(value);
            case 'rx':
            case 'tx':
                return formatBytes(value);
            default:
                return value.toFixed(2);
        }
    }

    /**
     * Formata uptime em segundos para formato legível
     */
    function formatUptime(seconds) {
        if (seconds < 60) return Math.floor(seconds) + 's';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h';
        return Math.floor(seconds / 86400) + 'd';
    }

    /**
     * Formata bytes para formato legível
     */
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    /**
     * Renderiza os cards das interfaces
     */
    function renderInterfaceCards() {
        const container = document.getElementById('interfaces-container');
        container.innerHTML = '';

        if (!metricsData.interfaces || Object.keys(metricsData.interfaces).length === 0) {
            return;
        }

        for (const [interfaceName, data] of Object.entries(metricsData.interfaces)) {
            const card = createInterfaceCard(interfaceName, data);
            container.appendChild(card);
        }
    }

    /**
     * Cria um card para uma interface
     */
    function createInterfaceCard(interfaceName, data) {
        const card = document.createElement('div');
        card.className = 'metric-card interface-card';
        card.dataset.metric = `interface-${interfaceName}`;

        const icon = getInterfaceIcon(interfaceName);
        const displayName = getInterfaceDisplayName(interfaceName);

        const rxStats = data.rx?.stats || { min: 0, max: 0, avg: 0 };
        const txStats = data.tx?.stats || { min: 0, max: 0, avg: 0 };

        card.innerHTML = `
            <div class="card-header">
                <div class="card-icon interface-icon">
                    <i class="${icon}"></i>
                </div>
                <h3>${displayName}</h3>
            </div>
            <div class="card-stats">
                <div class="stat-group">
                    <div class="stat-group-title">RX (Recebido)</div>
                    <div class="stat-row">
                        <span class="stat-label">Mín:</span>
                        <span class="stat-value">${formatBytes(rxStats.min)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Máx:</span>
                        <span class="stat-value">${formatBytes(rxStats.max)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Média:</span>
                        <span class="stat-value">${formatBytes(rxStats.avg)}</span>
                    </div>
                </div>
                <div class="stat-group">
                    <div class="stat-group-title">TX (Enviado)</div>
                    <div class="stat-row">
                        <span class="stat-label">Mín:</span>
                        <span class="stat-value">${formatBytes(txStats.min)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Máx:</span>
                        <span class="stat-value">${formatBytes(txStats.max)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Média:</span>
                        <span class="stat-value">${formatBytes(txStats.avg)}</span>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <button class="btn-expand" onclick="expandMetric('interface-${interfaceName}')">
                    <i class="fas fa-chart-line"></i> Ver Gráfico
                </button>
            </div>
        `;

        return card;
    }

    /**
     * Retorna o ícone apropriado para uma interface
     */
    function getInterfaceIcon(interfaceName) {
        const name = interfaceName.toLowerCase();
        
        if (name.includes('gateway') || name.includes('wan')) {
            return 'fas fa-globe';
        } else if (name.includes('wifi') || name.includes('wireless')) {
            return 'fas fa-wifi';
        } else if (name.includes('bridge')) {
            return 'fas fa-link';
        } else if (name.includes('uni-fi') || name.includes('unifi')) {
            return 'fas fa-network-wired';
        } else if (name.includes('hotspot')) {
            return 'fas fa-wifi-strong';
        } else if (name.includes('lan') || name.includes('ether')) {
            return 'fas fa-ethernet';
        } else {
            return 'fas fa-network-wired';
        }
    }

    /**
     * Retorna o nome de exibição para uma interface
     */
    function getInterfaceDisplayName(interfaceName) {
        if (interfaceName.includes(' - ')) {
            return interfaceName;
        }

        const name = interfaceName.toLowerCase();
        
        if (name.includes('gateway') || name.includes('wan')) {
            return 'Gateway (WAN)';
        } else if (name.includes('wifi1')) {
            return 'Wi-Fi 1';
        } else if (name.includes('wifi2')) {
            return 'Wi-Fi 2';
        } else if (name.includes('wifi')) {
            return 'Wi-Fi';
        } else if (name.includes('bridge')) {
            return 'Bridge - ' + interfaceName;
        } else if (name.includes('uni-fi') || name.includes('unifi')) {
            return 'Uni-Fi';
        } else if (name.includes('hotspot')) {
            return 'Hotspot';
        } else if (name.includes('lan') || name.includes('ether')) {
            return 'LAN - ' + interfaceName;
        } else {
            return interfaceName;
        }
    }

    /**
     * Expande um card para mostrar o gráfico
     */
    window.expandMetric = async function(metric) {
        currentExpandedMetric = metric;
        currentChartType = 'both';
        currentChartVisualization = 'area';
        
        const modal = document.getElementById('expandedModal');
        const modalTitle = document.getElementById('modalTitle');
        const chartTypeFilters = document.getElementById('chartTypeFilters');
        const chartVisualizationFilters = document.getElementById('chartVisualizationFilters');
        const expandedChartContainer = document.getElementById('expandedChart');

        // Determinar o título
        if (metric === 'cpu') {
            modalTitle.textContent = 'Uso de CPU (%)';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        } else if (metric === 'memory') {
            modalTitle.textContent = 'Uso de Memória (%)';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        } else if (metric === 'uptime') {
            modalTitle.textContent = 'Uptime';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        } else if (metric.startsWith('interface-')) {
            const interfaceName = metric.replace('interface-', '');
            modalTitle.textContent = `Tráfego - ${getInterfaceDisplayName(interfaceName)}`;
            chartTypeFilters.style.display = 'flex';
            chartVisualizationFilters.style.display = 'flex';
        } else if (metric === 'dhcp-clients') {
            modalTitle.textContent = 'Clientes DHCP Ativos';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        } else if (metric === 'wifi-clients') {
            modalTitle.textContent = 'Clientes Wi-Fi Conectados';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        } else if (metric === 'hotspot-clients') {
            modalTitle.textContent = 'Usuários Hotspot Ativos';
            chartTypeFilters.style.display = 'none';
            chartVisualizationFilters.style.display = 'none';
        }

        // Resetar botões
        document.querySelectorAll('#chartTypeFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('#chartTypeFilters .filter-btn[data-type="both"]')?.classList.add('active');
        
        document.querySelectorAll('#chartVisualizationFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('#chartVisualizationFilters .filter-btn[data-visualization="area"]')?.classList.add('active');

        modal.classList.remove('hidden');
        await updateExpandedChart(currentRange);
    };

    /**
     * Muda o tipo de gráfico (RX, TX, RX+TX)
     */
    window.updateChartType = async function(type) {
        currentChartType = type;
        
        // Atualizar botões
        document.querySelectorAll('#chartTypeFilters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#chartTypeFilters .filter-btn[data-type="${type}"]`)?.classList.add('active');
        
        // Recriar gráfico
        await updateExpandedChart(currentRange);
    };

    /**
     * Muda o tipo de visualização do gráfico (área, barras, linha)
     */
    window.updateChartVisualization = async function(visualization) {
        currentChartVisualization = visualization;
        
        // Atualizar botões
        document.querySelectorAll('#chartVisualizationFilters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`#chartVisualizationFilters .filter-btn[data-visualization="${visualization}"]`)?.classList.add('active');
        
        // Recriar gráfico
        await updateExpandedChart(currentRange);
    };

    /**
     * Atualiza o gráfico expandido
     */
    window.updateExpandedChart = async function(range) {
        try {
            // Atualizar botões de filtro de período
            document.querySelectorAll('.modal-filters .filter-btn[data-range]').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector(`.modal-filters .filter-btn[data-range="${range}"]`)?.classList.add('active');

            currentRange = range;

            // Buscar dados
            const response = await apiRequest(`/api/monitoring/router/${routerId}/detailed-metrics?range=${range}`);
            
            if (!response.success) {
                throw new Error(response.message);
            }

            // Extrair dados corretamente
            let apiData = response.data;
            if (apiData && apiData.data) {
                apiData = apiData.data;
            }

            const chartContainer = document.getElementById('expandedChart');
            chartContainer.innerHTML = '';

            // Criar gráfico baseado na métrica
            if (currentExpandedMetric === 'cpu') {
                if (apiData.system?.cpu?.data) {
                    createExpandedChart(chartContainer, 'CPU (%)', apiData.system.cpu.data, '#e48315');
                } else {
                    chartContainer.innerHTML = '<p style="color: #f0f0f0; padding: 20px;">Sem dados disponíveis para CPU</p>';
                }
            } else if (currentExpandedMetric === 'memory') {
                if (apiData.system?.memory?.data) {
                    createExpandedChart(chartContainer, 'Memória (%)', apiData.system.memory.data, '#3b82f6');
                } else {
                    chartContainer.innerHTML = '<p style="color: #f0f0f0; padding: 20px;">Sem dados disponíveis para Memória</p>';
                }
            } else if (currentExpandedMetric === 'uptime') {
                if (apiData.system?.uptime?.data) {
                    createExpandedChart(chartContainer, 'Uptime (segundos)', apiData.system.uptime.data, '#10b981');
                } else {
                    chartContainer.innerHTML = '<p style="color: #f0f0f0; padding: 20px;">Sem dados disponíveis para Uptime</p>';
                }
            } else if (currentExpandedMetric.startsWith('interface-')) {
                const interfaceName = currentExpandedMetric.replace('interface-', '');
                const interfaceData = apiData.interfaces?.[interfaceName];
                
                if (interfaceData) {
                    createDualChart(chartContainer, interfaceName, interfaceData);
                } else {
                    chartContainer.innerHTML = '<p style="color: #f0f0f0; padding: 20px;">Sem dados disponíveis para esta interface</p>';
                }
            } else if (currentExpandedMetric.endsWith('-clients')) {
                // Lógica para exibir listas de clientes
                const clientType = currentExpandedMetric.replace('-clients', '');
                const clientData = metricsData[`${clientType}Clients`];
                if (clientData && clientData.length > 0) {
                    createClientList(chartContainer, clientData, clientType);
                } else if (clientType === 'wifi' && metricsData.wifiAnalytics) { // Gráfico Wi-Fi
                    createGenericPieChart(chartContainer, 'Distribuição de Clientes Wi-Fi', metricsData.wifiAnalytics);
                } else if (clientType === 'dhcp' && metricsData.dhcpAnalytics) { // Gráfico DHCP
                    createGenericDistributionChart(chartContainer, 'Distribuição de Clientes DHCP', metricsData.dhcpAnalytics);
                } else if (clientType === 'hotspot' && metricsData.hotspotAnalytics) { // Gráfico Hotspot
                    createHotspotBarChart(chartContainer, 'Clientes Hotspot Únicos', metricsData.hotspotAnalytics);
                }
                else {
                    chartContainer.innerHTML = `<p style="color: #f0f0f0; padding: 20px;">Nenhum cliente ${clientType} encontrado.</p>`;
                }
            }

        } catch (error) {
            console.error('Erro ao atualizar gráfico:', error);
            document.getElementById('expandedChart').innerHTML = `<p style="color: #ff6b6b; padding: 20px;">Erro: ${error.message}</p>`;
        }
    };

    /**
     * Cria um gráfico expandido
     */
    function createExpandedChart(container, title, data, color) {
        const chartDiv = document.createElement('div');
        chartDiv.id = 'expandedChartContent';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);

        const options = {
            chart: {
                type: currentChartVisualization,
                height: 500,
                zoom: { enabled: true },
                toolbar: { show: true }
            },
            series: [{
                name: title,
                data: data
            }],
            xaxis: {
                type: 'datetime',
                labels: { 
                    style: { colors: '#a0a0a0' },
                    datetimeUTC: false 
                }
            },
            yaxis: {
                labels: { style: { colors: '#a0a0a0' } }
            },
            stroke: { curve: 'smooth', width: 2 },
            colors: [color],
            theme: { mode: 'dark' },
            dataLabels: { enabled: false },
            tooltip: {
                x: { format: 'dd MMM yyyy - HH:mm' },
                theme: 'dark'
            }
        };

        if (expandedChartInstance) {
            expandedChartInstance.destroy();
        }

        expandedChartInstance = new ApexCharts(chartDiv, options);
        expandedChartInstance.render();
    }

    /**
     * Cria um gráfico com duas séries (RX e TX)
     */
    function createDualChart(container, interfaceName, interfaceData) {
        const chartDiv = document.createElement('div');
        chartDiv.id = 'expandedChartContent';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);

        // Preparar dados baseado no tipo selecionado
        let series = [];
        
        if (currentChartType === 'both') {
            series = [
                {
                    name: 'RX (Recebido)',
                    data: interfaceData.rx.data
                },
                {
                    name: 'TX (Enviado)',
                    data: interfaceData.tx.data
                }
            ];
        } else if (currentChartType === 'rx') {
            series = [
                {
                    name: 'RX (Recebido)',
                    data: interfaceData.rx.data
                }
            ];
        } else if (currentChartType === 'tx') {
            series = [
                {
                    name: 'TX (Enviado)',
                    data: interfaceData.tx.data
                }
            ];
        }

        const options = {
            chart: {
            type: currentChartVisualization,
            height: 500,
            zoom: { enabled: true },
            toolbar: { show: true }
            },
            series: series,
            xaxis: {
            type: 'datetime',
            labels: { 
                style: { colors: '#a0a0a0' },
                datetimeUTC: false
            }
            },
            yaxis: {
            labels: { 
                style: { colors: '#a0a0a0' },
                formatter: function(value) {
                return formatBytes(value);
                }
            }
            },
            stroke: { curve: 'smooth', width: 2 },
            colors: currentChartType === 'rx' ? ['#3b82f6'] : currentChartType === 'tx' ? ['#10b981'] : ['#3b82f6', '#10b981'],
            theme: { mode: 'dark' },
            dataLabels: { enabled: false },
            tooltip: {
            x: { format: 'dd MMM yyyy - HH:mm' },
            y: {
                formatter: function(value) {
                return formatBytes(value);
                }
            },
            theme: 'dark'
            }
        };

        if (expandedChartInstance) {
            expandedChartInstance.destroy();
        }

        expandedChartInstance = new ApexCharts(chartDiv, options);
        expandedChartInstance.render();
    }

    /**
     * Cria uma lista de clientes no modal
     */
    function createClientList(container, clients, type) {
        container.innerHTML = ''; // Limpa o container
        const table = document.createElement('table');
        table.className = 'client-table';

        // Cabeçalho da tabela
        let headers = ['MAC Address', 'IP Address', 'Uptime'];
        if (type === 'dhcp') headers = ['MAC Address', 'IP Address', 'Host Name', 'Status'];
        if (type === 'hotspot') headers = ['User', 'MAC Address', 'IP Address', 'Uptime'];

        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // Corpo da tabela
        const tbody = table.createTBody();
        clients.forEach(client => {
            const row = tbody.insertRow();
            // A ordem e os campos dependem do que a API retorna para 'details'
            // Este é um exemplo genérico
            const mac = client['mac-address'] || client.mac_address || 'N/A';
            const ip = client.address || 'N/A';
            const uptime = client.uptime || 'N/A';
            const host = client['host-name'] || 'N/A';
            const user = client.user || 'N/A';

            if (type === 'dhcp') row.innerHTML = `<td>${mac}</td><td>${ip}</td><td>${host}</td><td>${client.status || 'N/A'}</td>`;
            else if (type === 'hotspot') row.innerHTML = `<td>${user}</td><td>${mac}</td><td>${ip}</td><td>${uptime}</td>`;
            else row.innerHTML = `<td>${mac}</td><td>${ip}</td><td>${uptime}</td>`;
        });

        container.appendChild(table);
    }

    /**
     * NOVO: Cria um gráfico de pizza para a análise de clientes Wi-Fi
     */
    function createGenericDistributionChart(container, title, analyticsData) {
        container.innerHTML = ''; // Limpa o container
        const chartDiv = document.createElement('div');
        chartDiv.id = 'expandedChartContent';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);
        
        // A visualização padrão é pizza, mas pode ser alterada pelos filtros
        let chartType = 'pie';
        if (currentChartVisualization === 'bar') chartType = 'bar';
        if (currentChartVisualization === 'line') chartType = 'line';

        const options = {
            chart: {
                type: chartType,
                height: 500,
                toolbar: { show: true }
            },
            series: analyticsData.distribution.series,
            labels: analyticsData.distribution.labels,
            colors: ['#3b82f6', '#10b981', '#e48315'],
            theme: { mode: 'dark' },
            legend: {
                position: 'bottom',
                labels: {
                    colors: '#a0a0a0'
                }
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " clientes"
                    }
                },
                theme: 'dark'
            },
            xaxis: { // Usado para gráficos de barra
                categories: analyticsData.distribution.labels,
                labels: { style: { colors: '#a0a0a0' } }
            },
            plotOptions: { // Usado para gráficos de barra
                bar: {
                    horizontal: currentChartVisualization === 'bar-horizontal', // Lógica para barras horizontais
                    distributed: chartType === 'bar' // Cores diferentes por barra
                }
            },
            responsive: [{
                breakpoint: 480,
                options: {
                    chart: {
                        width: 200
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }]
        };

        if (expandedChartInstance) {
            expandedChartInstance.destroy();
        }

        expandedChartInstance = new ApexCharts(chartDiv, options);
        expandedChartInstance.render();

        // Mostra os filtros de visualização para este tipo de gráfico
        const chartVisualizationFilters = document.getElementById('chartVisualizationFilters');
        chartVisualizationFilters.style.display = 'flex';
    }

    /**
     * NOVO: Cria um gráfico de barras para a análise de clientes Hotspot
     */
    function createHotspotBarChart(container, title, analyticsData) {
        container.innerHTML = ''; // Limpa o container
        const chartDiv = document.createElement('div');
        chartDiv.id = 'expandedChartContent';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);

        const seriesData = [
            analyticsData.last_1h,
            analyticsData.last_24h,
            analyticsData.last_7d,
            analyticsData.last_15d,
            analyticsData.last_30d
        ];
        const labels = ['Última 1h', 'Últimas 24h', 'Últimos 7d', 'Últimos 15d', 'Últimos 30d'];

        const options = {
            chart: {
                type: 'bar',
                height: 500,
                toolbar: { show: true }
            },
            series: [{
                name: 'Clientes Únicos',
                data: seriesData
            }],
            plotOptions: {
                bar: {
                    distributed: true, // Cores diferentes por barra
                    horizontal: false,
                }
            },
            xaxis: {
                categories: labels,
                labels: { style: { colors: '#a0a0a0' } }
            },
            yaxis: {
                labels: { style: { colors: '#a0a0a0' } }
            },
            colors: ['#3b82f6', '#10b981', '#e48315', '#9333ea', '#f59e0b'],
            theme: { mode: 'dark' },
            legend: { show: false }, // Não precisa de legenda para uma única série
            tooltip: { theme: 'dark' }
        };

        if (expandedChartInstance) expandedChartInstance.destroy();
        expandedChartInstance = new ApexCharts(chartDiv, options);
        expandedChartInstance.render();
    }

    /**
     * Fecha o gráfico expandido
     */
    window.closeExpandedChart = function() {
        const modal = document.getElementById('expandedModal');
        modal.classList.add('hidden');
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
        }
    };

    /**
     * Configura os event listeners
     */
    function setupEventListeners() {
        // Fechar modal ao clicar fora
        document.getElementById('expandedModal').addEventListener('click', (e) => {
            if (e.target.id === 'expandedModal') {
                closeExpandedChart();
            }
        });
    }

    /**
     * Mostra estado de erro
     */
    function showErrorState(message) {
        document.getElementById('routerNameTitle').textContent = 'Erro ao carregar dados';
        console.error(message);
    }
});
