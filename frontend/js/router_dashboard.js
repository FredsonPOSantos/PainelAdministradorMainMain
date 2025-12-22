// Ficheiro: frontend/js/router_dashboard.js
// Dashboard de Roteador com Cards Interativos

document.addEventListener('DOMContentLoaded', () => {
    // ===== VARIÁVEIS GLOBAIS =====
    const routerId = window.location.hash.substring(1);
    // [CORRIGIDO] Define o range padrão para o modal. O range do dashboard principal agora é fixo.
    let currentRange = '1h'; 
    const DASHBOARD_SUMMARY_RANGE = '24h'; // [NOVO] Range fixo para os cards de resumo da página principal.
    let cpuChartInstance = null;
    let memoryChartInstance = null;
    let trafficDistributionChartInstance = null;
    let metricsData = {};
    let expandedChartInstance = null;
    let liveUpdateInterval = null; // [NOVO] Para controlar o intervalo de atualização
    const liveUpdateToggle = document.getElementById('liveUpdateToggle'); // [NOVO] Botão de toggle
    let currentExpandedMetric = null;
    let currentChartType = 'both'; // 'rx', 'tx', 'both'
    let currentChartVisualization = 'area'; // 'area', 'bar', 'line'

    // ===== VALIDAÇÃO INICIAL =====
    if (!routerId || isNaN(routerId)) {
        document.getElementById('routerNameTitle').textContent = 'ID do Roteador Inválido';
        return;
    }

    // ===== INICIALIZAÇÃO =====
    // [NOVO] Fallback para o preloader se a página for aberta diretamente (standalone)
    // Isso garante que o utilizador veja o carregamento mesmo sem o admin_dashboard.js
    if (typeof window.showPagePreloader !== 'function') {
        const preloaderId = 'standalone-preloader';
        if (!document.getElementById(preloaderId)) {
            const overlay = document.createElement('div');
            overlay.id = preloaderId;
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: #111827; z-index: 99999; display: flex;
                justify-content: center; align-items: center; flex-direction: column;
                color: #fff; font-family: system-ui, -apple-system, sans-serif;
            `;
            overlay.innerHTML = `
                <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p id="${preloaderId}-text" style="margin-top: 1rem; font-size: 1.1rem;">A carregar dashboard...</p>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
            document.body.appendChild(overlay);
        }
        window.showPagePreloader = (msg) => {
            const el = document.getElementById(preloaderId);
            if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'all'; }
            const txt = document.getElementById(`${preloaderId}-text`);
            if (txt && msg) txt.textContent = msg;
        };
        window.hidePagePreloader = () => {
            const el = document.getElementById(preloaderId);
            if (el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; setTimeout(() => el.remove(), 500); }
        };
    }

    // Mostra o preloader imediatamente
    window.showPagePreloader('A carregar dashboard do roteador...');

    // [CORRIGIDO] Carrega os dados de resumo com o range fixo de 24h para garantir que os valores de MÍN/MÁX/MÉD sejam consistentes.
    loadMetrics(DASHBOARD_SUMMARY_RANGE).finally(() => {
        window.hidePagePreloader();
    });
    setupEventListeners();
    startLiveUpdates(); // [NOVO] Inicia as atualizações em tempo real por padrão

    // ===== FUNÇÕES PRINCIPAIS =====

    /**
     * Carrega as métricas da API
     */
    async function loadMetrics(range) {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/detailed-metrics?range=${range}`);

            // [CORRIGIDO] A API retorna { success: true, data: { ... } }. O objeto de dados está em response.data.
            let apiData = response.data; // [CORRIGIDO]

            if (!apiData) {
                throw new Error('Dados vazios retornados da API');
            }

            metricsData = apiData;

            // Atualizar header
            // [MODIFICADO] Exibe o nome e a versão do roteador (se disponível) na mesma linha
            const routerName = metricsData.routerName || 'Roteador Desconhecido';
            const routerVersion = metricsData.routerVersion || metricsData.version || (metricsData.system && metricsData.system.version) || '';
            
            const titleEl = document.getElementById('routerNameTitle');
            if (titleEl) {
                titleEl.innerHTML = `${routerName}${routerVersion ? ` <span class="router-version-tag">${routerVersion}</span>` : ''}`;
                
                // [NOVO] Injeta o botão de reiniciar se não existir
                if (!document.getElementById('rebootRouterBtn')) {
                    const btn = document.createElement('button');
                    btn.id = 'rebootRouterBtn';
                    btn.className = 'btn-danger';
                    btn.style.cssText = 'margin-left: 15px; padding: 5px 15px; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 5px; vertical-align: middle; cursor: pointer; border: none; border-radius: 5px; color: white; background-color: #ef4444;';
                    btn.innerHTML = '<i class="fas fa-power-off"></i> Reiniciar';
                    btn.onclick = () => handleRebootRouter(metricsData.routerId, metricsData.routerName);
                    titleEl.appendChild(btn);
                }
            }

            const ipDisplay = document.getElementById('routerIpDisplay');
            ipDisplay.textContent = `IP: ${metricsData.routerIp || 'Desconhecido'}`;

            // [NOVO] Exibe o Uptime logo abaixo do IP
            let uptimeDisplay = document.getElementById('routerUptimeDisplay');
            if (!uptimeDisplay) {
                uptimeDisplay = document.createElement('p');
                uptimeDisplay.id = 'routerUptimeDisplay';
                uptimeDisplay.style.cssText = 'margin: 4px 0 0 0; color: #9CA3AF; font-size: 0.9em;';
                ipDisplay.after(uptimeDisplay);
            }
            uptimeDisplay.textContent = `Uptime: ${formatUptime(metricsData.currentUptime)}`;
            
            // [NOVO] Preenche os valores iniciais do cabeçalho de tempo real
            document.getElementById('liveCpu').textContent = metricsData.system?.cpu?.stats?.current.toFixed(2) + '%' || '0%';
            document.getElementById('liveMemory').textContent = metricsData.system?.memory?.stats?.current.toFixed(2) + '%' || '0%';

            // Atualizar cards
            await updateCards(); // [MODIFICADO] Agora aguarda a atualização completa dos cards

        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Atualiza os cards com os dados carregados
     */
    async function updateCards() { // [MODIFICADO] Agora é async para permitir Promise.all
        // Sistema
        if (metricsData.system) {            
            renderCpuChart(metricsData.system.cpu);
            renderMemoryChart(metricsData.system.memory);
            updateCardStats('uptime', metricsData.system.uptime);
        }

        // Interfaces
        if (metricsData.interfaces) {
            renderInterfaceCards();
            renderTrafficDistributionChart(metricsData.interfaces);
        }

        // [MODIFICADO] Carrega todos os dados adicionais em paralelo e aguarda a conclusão
        await Promise.all([
            loadClientsData(),
            loadWifiAnalytics(),
            loadDhcpAnalytics(),
            loadHotspotAnalytics(),
            loadAvailabilityData()
        ]);
    }

    /**
     * [NOVO] Lida com o clique no botão de reiniciar
     */
    const handleRebootRouter = async (id, name) => {
        const credentials = await showCredentialPrompt(`Reiniciar Roteador "${name}"`);

        if (!credentials) {
            // O utilizador cancelou
            return;
        }

        const btn = document.getElementById('rebootRouterBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A reiniciar...';

        try {
            // Envia as credenciais no corpo da requisição
            const response = await apiRequest(`/api/routers/${id}/reboot`, 'POST', {
                username: credentials.username,
                password: credentials.password,
                ip_address: metricsData.routerIp // [NOVO] Envia o IP para evitar consulta ao DB
            });
            alert(response.message || 'Comando enviado com sucesso.');
        } catch (error) {
            alert(`Erro ao reiniciar: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    /**
     * [NOVO] Mostra um modal para pedir credenciais da API.
     * @param {string} title - O título do modal.
     * @returns {Promise<{username: string, password: string}|null>}
     */
    function showCredentialPrompt(title) {
        return new Promise((resolve) => {
            const existingModal = document.getElementById('credentialPromptModal');
            if (existingModal) existingModal.remove();

            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'credentialPromptModal';
            modalOverlay.className = 'confirmation-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="confirmation-modal-content" style="width: 400px; max-width: 90%;">
                    <h3>${title}</h3>
                    <p style="font-size: 0.9em; color: #9CA3AF;">Insira as credenciais da API do MikroTik para esta ação. Elas não serão guardadas.</p>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                        <input type="text" id="promptUsername" placeholder="Usuário API (ex: admin)" style="width: 100%; padding: 10px; background: #374151; border: 1px solid #4B5563; color: white; border-radius: 4px;">
                        <input type="password" id="promptPassword" placeholder="Senha API" style="width: 100%; padding: 10px; background: #374151; border: 1px solid #4B5563; color: white; border-radius: 4px;">
                    </div>
                    <div class="confirmation-modal-buttons" style="margin-top: 1.5rem;">
                        <button class="confirmation-modal-btn" data-action="cancel">Cancelar</button>
                        <button class="confirmation-modal-btn" data-action="confirm">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modalOverlay);
            setTimeout(() => modalOverlay.classList.add('visible'), 10);

            const usernameInput = document.getElementById('promptUsername');
            usernameInput.focus();

            const confirmBtn = modalOverlay.querySelector('button[data-action="confirm"]');
            const cancelBtn = modalOverlay.querySelector('button[data-action="cancel"]');

            const resolveAndClose = (value) => {
                modalOverlay.classList.remove('visible');
                modalOverlay.addEventListener('transitionend', () => {
                    modalOverlay.remove();
                    resolve(value);
                });
            };

            confirmBtn.onclick = () => {
                const username = usernameInput.value;
                const password = document.getElementById('promptPassword').value;
                if (!username || !password) {
                    alert('Usuário e senha são obrigatórios.');
                    return;
                }
                resolveAndClose({ username, password });
            };

            cancelBtn.onclick = () => resolveAndClose(null);
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) resolveAndClose(null);
            };
        });
    }

    /**
     * [NOVO] Busca e atualiza os dados do cabeçalho em tempo real.
     */
    async function fetchLiveSummary() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/live-summary`);
            if (response.success && response.data) {
                const liveData = response.data; // [CORRIGIDO] A API retorna { success: true, data: {...} }.
                document.getElementById('liveCpu').textContent = liveData.cpu.toFixed(2) + '%';
                document.getElementById('liveMemory').textContent = liveData.memory.toFixed(2) + '%';
                document.getElementById('liveClients').textContent = liveData.clients;
            }
        } catch (error) {
            console.warn('Falha ao buscar live summary:', error.message);
            // Opcional: mostrar um indicador de erro no cabeçalho
        }
    }

    /**
     * [NOVO] Inicia o polling para atualizações em tempo real.
     */
    function startLiveUpdates() {
        if (liveUpdateInterval) clearInterval(liveUpdateInterval); // Limpa qualquer intervalo anterior
        fetchLiveSummary(); // Busca imediatamente
        liveUpdateInterval = setInterval(fetchLiveSummary, 5000); // Atualiza a cada 5 segundos
        if (liveUpdateToggle) liveUpdateToggle.checked = true;
        console.log("Live updates iniciados.");
    }

    /**
     * [NOVO] Para o polling de atualizações em tempo real.
     */
    function stopLiveUpdates() {
        if (liveUpdateInterval) {
            clearInterval(liveUpdateInterval);
            liveUpdateInterval = null;
        }
        if (liveUpdateToggle) liveUpdateToggle.checked = false;
        console.log("Live updates parados.");
    }

    /**
     * Carrega dados de clientes (Wi-Fi e DHCP)
     */
    async function loadClientsData() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/clients`);

            // [CORRIGIDO] A API retorna { success: true, data: { ... } }. O objeto de dados está em response.data.
            let apiData = response.data; // [CORRIGIDO]

            if (apiData && apiData.clients) {
                // Armazenar dados para exibição no modal
                metricsData.wifiClients = apiData.clients.wifi?.details || [];
                metricsData.dhcpClients = apiData.clients.dhcp?.details || [];
                metricsData.hotspotClients = apiData.clients.hotspot?.details || [];

                // [NOVO] Atualiza a contagem de clientes no cabeçalho com a lógica unificada
                const clientCardCount = apiData.clients.hotspot?.count || apiData.clients.wifi?.count || apiData.clients.dhcp?.count || 0;
                document.getElementById('liveClients').textContent = clientCardCount;
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

            // [CORRIGIDO] A API retorna { success: true, data: {...} }. O acesso correto é response.data.
            const availability = response.data;
            
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

    function renderCpuChart(cpuData) {
        const container = document.getElementById('cpu-chart-container');
        if (!container || !cpuData || !cpuData.stats) return;
    
        // Update text stats
        document.getElementById('cpu-min').textContent = formatValue(cpuData.stats.min, 'cpu');
        document.getElementById('cpu-avg').textContent = formatValue(cpuData.stats.avg, 'cpu');
        document.getElementById('cpu-max').textContent = formatValue(cpuData.stats.max, 'cpu');
    
        const options = {
            chart: { type: 'radialBar', height: '100%', sparkline: { enabled: false }, background: 'transparent' },
            series: [cpuData.stats.current],
            plotOptions: {
                radialBar: {
                    startAngle: -90,
                    endAngle: 90,
                    hollow: { margin: 20, size: '50%' }, // [CORRIGIDO] Unificado com o gráfico de memória para um visual consistente.
                    track: { background: '#374151' },
                    offsetY: 15, // [CORRIGIDO] Desloca o gráfico para baixo para melhor centralização vertical.
                    dataLabels: {
                        name: { show: false },
                        value: {
                            offsetY: -2,
                            fontSize: '22px',
                            color: '#E5E7EB',
                            formatter: (val) => val.toFixed(1) + '%'
                        }
                    }
                }
            },
            // [REMOVIDO] A propriedade grid.padding não é mais necessária com o ajuste de offsetY.
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    type: 'horizontal',
                    shadeIntensity: 0.5,
                    gradientToColors: ['#e48315'],
                    inverseColors: true,
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 100]
                }
            },
            stroke: { lineCap: 'round' },
            labels: ['CPU'],
        };
    
        if (cpuChartInstance) {
            cpuChartInstance.updateSeries([cpuData.stats.current]);
        } else {
            cpuChartInstance = new ApexCharts(container, options);
            cpuChartInstance.render();
        }
    }

    function renderMemoryChart(memoryData) {
        const container = document.getElementById('memory-chart-container');
        if (!container || !memoryData || !memoryData.stats) return;
    
        document.getElementById('memory-min').textContent = formatValue(memoryData.stats.min, 'memory');
        document.getElementById('memory-avg').textContent = formatValue(memoryData.stats.avg, 'memory');
        document.getElementById('memory-max').textContent = formatValue(memoryData.stats.max, 'memory');
    
        const options = {
            chart: { type: 'radialBar', height: '100%', sparkline: { enabled: false }, background: 'transparent' },
            series: [memoryData.stats.current],
            plotOptions: {
                radialBar: {
                    startAngle: -90,
                    endAngle: 90,
                    hollow: { margin: 20, size: '50%' },
                    track: { background: '#374151' },
                    offsetY: 15, // [CORRIGIDO] Desloca o gráfico para baixo para melhor centralização vertical.
                    dataLabels: {
                        name: { show: false },
                        value: {
                            offsetY: -2,
                            fontSize: '22px',
                            color: '#E5E7EB',
                            formatter: (val) => val.toFixed(1) + '%'
                        }
                    }
                }
            },
            // [REMOVIDO] A propriedade grid.padding não é mais necessária com o ajuste de offsetY.
            fill: {
                type: 'gradient',
                gradient: {
                    shade: 'dark',
                    type: 'horizontal',
                    shadeIntensity: 0.5,
                    gradientToColors: ['#3b82f6'], // Blue color for memory
                    inverseColors: true,
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 100]
                }
            },
            stroke: { lineCap: 'round' },
            labels: ['Memory'],
        };
        
        if (memoryChartInstance) {
            memoryChartInstance.updateSeries([memoryData.stats.current]);
        } else {
            memoryChartInstance = new ApexCharts(container, options);
            memoryChartInstance.render();
        }
    }

    function renderTrafficDistributionChart(interfacesData) {
        const container = document.getElementById('traffic-distribution-chart-container');
        if (!container) return;
    
        const etherInterfaces = Object.entries(interfacesData)
            // [CORRIGIDO] Filtra por interfaces físicas e pontes, excluindo virtuais como WireGuard.
            .filter(([name]) => ['ether', 'wifi', 'bridge'].some(type => name.toLowerCase().includes(type)))
            .map(([name, data]) => ({
                name: getInterfaceDisplayName(name),
                traffic: (data.rx?.stats?.avg || 0) + (data.tx?.stats?.avg || 0)
            }))
            .filter(item => item.traffic > 0);
    
        if (etherInterfaces.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #9CA3AF; font-size: 0.9em; padding: 20px;">Sem dados de tráfego nas interfaces "ether" para exibir.</p>';
            return;
        }
    
        const series = etherInterfaces.map(item => item.traffic);
        const labels = etherInterfaces.map(item => item.name);
    
        const options = {
            chart: { type: 'donut', height: 400, background: 'transparent' }, // [CORRIGIDO] Define uma altura fixa para o gráfico para evitar que ele transborde e sobreponha o título.
            series: series,
            labels: labels,
            // [CORRIGIDO] Remove o tema 'dark' que estava a forçar um fundo cinzento no SVG, ignorando a opção 'transparent'.
            colors: ['#5470C6', '#215f05ff', '#f0a80cff', '#e01010ff', '#17a9e2ff', '#5132daff', '#9311cfff'], // [NOVO] Paleta de cores com melhor visibilidade e contraste.
            legend: {
                position: 'bottom',
                fontSize: '16px', // [NOVO] Reduz o tamanho da fonte da legenda para melhor ajuste.
                labels: { colors: '#E5E7EB' }
            },
            tooltip: { y: { formatter: (val) => formatBytes(val) + '/s' } },
            // [MODIFICADO] Simplifica os rótulos para mostrar apenas a percentagem,
            // o que é mais limpo e evita sobreposição no gráfico.
            dataLabels: {
                formatter: (val) => val.toFixed(1) + '%'
            }
        };
    
        if (trafficDistributionChartInstance) {
            trafficDistributionChartInstance.updateOptions(options);
        } else {
            trafficDistributionChartInstance = new ApexCharts(container, options);
            trafficDistributionChartInstance.render();
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

            // [CORRIGIDO] A API retorna { success: true, data: {...} }. O acesso correto é response.data.
            const wifiData = response.data;
            
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

            // [CORRIGIDO] A API retorna { success: true, data: {...} }. O acesso correto é response.data.
            const dhcpData = response.data;
            
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

            // [CORRIGIDO] A API retorna { success: true, data: {...} }. O acesso correto é response.data.
            const hotspotData = response.data;
            
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
        if (!seconds) return 'Desconhecido';
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);

        return parts.join(' ') || Math.floor(seconds) + 's';
    }

    /**
     * [REMOVIDO] A função formatBytes foi movida para o ficheiro global utils.js
     */

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
     * [NOVO] Atualiza as métricas de uma interface específica quando o período é alterado
     */
    window.updateInterfaceMetrics = async (interfaceName, range) => {
        const ids = [
            `rx-min-${interfaceName}`, `rx-max-${interfaceName}`, `rx-avg-${interfaceName}`,
            `tx-min-${interfaceName}`, `tx-max-${interfaceName}`, `tx-avg-${interfaceName}`
        ];
        
        // Mostrar loading
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '...';
        });

        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/detailed-metrics?range=${range}`);
            if (response.success && response.data && response.data.interfaces && response.data.interfaces[interfaceName]) {
                const data = response.data.interfaces[interfaceName];
                const rxStats = data.rx?.stats || { min: 0, max: 0, avg: 0 };
                const txStats = data.tx?.stats || { min: 0, max: 0, avg: 0 };

                document.getElementById(`rx-min-${interfaceName}`).textContent = formatBitsPerSecond(rxStats.min);
                document.getElementById(`rx-max-${interfaceName}`).textContent = formatBitsPerSecond(rxStats.max);
                document.getElementById(`rx-avg-${interfaceName}`).textContent = formatBitsPerSecond(rxStats.avg);

                document.getElementById(`tx-min-${interfaceName}`).textContent = formatBitsPerSecond(txStats.min);
                document.getElementById(`tx-max-${interfaceName}`).textContent = formatBitsPerSecond(txStats.max);
                document.getElementById(`tx-avg-${interfaceName}`).textContent = formatBitsPerSecond(txStats.avg);
            }
        } catch (error) {
            console.error('Erro ao atualizar métricas da interface:', error);
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = 'Erro';
            });
        }
    };

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

        // Define o seletor de período com estilo inline para se ajustar ao cabeçalho
        const isSelected = (val) => val === DASHBOARD_SUMMARY_RANGE ? 'selected' : '';

        card.innerHTML = `
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="card-icon interface-icon">
                        <i class="${icon}"></i>
                    </div>
                    <h3 style="margin: 0;">${displayName}</h3>
                </div>
                <select class="interface-range-select" style="padding: 2px 5px; border-radius: 4px; background: #374151; color: #fff; border: 1px solid #4B5563; font-size: 0.8rem;" onchange="updateInterfaceMetrics('${interfaceName}', this.value)">
                    <option value="1h" ${isSelected('1h')}>1h</option>
                    <option value="24h" ${isSelected('24h')}>24h</option>
                    <option value="15d" ${isSelected('15d')}>15d</option>
                    <option value="30d" ${isSelected('30d')}>30d</option>
                </select>
            </div>
            <div class="card-stats">
                <div class="stat-group">
                    <div class="stat-group-title">RX (Recebido)</div>
                    <div class="stat-row">
                        <span class="stat-label">Mín:</span>
                        <span class="stat-value" id="rx-min-${interfaceName}">${formatBitsPerSecond(rxStats.min)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Máx:</span>
                        <span class="stat-value" id="rx-max-${interfaceName}">${formatBitsPerSecond(rxStats.max)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Média:</span>
                        <span class="stat-value" id="rx-avg-${interfaceName}">${formatBitsPerSecond(rxStats.avg)}</span>
                    </div>
                </div>
                <div class="stat-group">
                    <div class="stat-group-title">TX (Enviado)</div>
                    <div class="stat-row">
                        <span class="stat-label">Mín:</span>
                        <span class="stat-value" id="tx-min-${interfaceName}">${formatBitsPerSecond(txStats.min)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Máx:</span>
                        <span class="stat-value" id="tx-max-${interfaceName}">${formatBitsPerSecond(txStats.max)}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Média:</span>
                        <span class="stat-value" id="tx-avg-${interfaceName}">${formatBitsPerSecond(txStats.avg)}</span>
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
        
        // [NOVO] Tenta obter o range selecionado no card específico, se existir (para interfaces)
        let rangeToUse = currentRange;
        const card = document.querySelector(`.metric-card[data-metric="${metric}"]`);
        if (card) {
            const select = card.querySelector('select.interface-range-select');
            if (select) {
                rangeToUse = select.value;
            }
        }
        await updateExpandedChart(rangeToUse);
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

            // [CORRIGIDO] A API retorna { success: true, data: {...} }. O acesso correto é response.data.
            const apiData = response.data;

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
                    // [CORREÇÃO] A chamada estava para uma função de gráfico de pizza que não existe (`createGenericPieChart`) e os dados não são para pizza.
                    // A chamada correta é para o gráfico de barras de Wi-Fi, que já está definido.
                    createWifiBarChart(chartContainer, 'Clientes Wi-Fi Únicos', metricsData.wifiAnalytics);
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
     * NOVO: Cria um gráfico de barras para a análise de clientes Wi-Fi
     */
    function createWifiBarChart(container, title, analyticsData) {
        container.innerHTML = ''; // Limpa o container
        const chartDiv = document.createElement('div');
        chartDiv.id = 'expandedChartContent';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '500px';
        container.appendChild(chartDiv);

        const seriesData = [
            analyticsData.last_1h,
            analyticsData.last_7d,
            analyticsData.last_30d
        ];
        const labels = ['Última 1h', 'Últimos 7d', 'Últimos 30d'];

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
            colors: ['#3b82f6', '#10b981', '#e48315'],
            theme: { mode: 'dark' },
            legend: { show: false }, // Não precisa de legenda para uma única série
            tooltip: { theme: 'dark' }
        };

        if (expandedChartInstance) expandedChartInstance.destroy();
        expandedChartInstance = new ApexCharts(chartDiv, options);
        expandedChartInstance.render();
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
        
        // [CORREÇÃO] Simplificado para ser sempre um gráfico de pizza, que é o ideal para distribuição.
        // A complexidade de tentar mudar o tipo de gráfico estava a causar o erro "Cannot read properties of null (reading 'hidden')".
        const options = {
            chart: {
                type: 'pie', // Força o tipo para 'pie'
                height: 500,
                toolbar: { show: true }
            },
            series: analyticsData.distribution.series,
            labels: analyticsData.distribution.labels,
            colors: ['#3b82f6', '#10b981', '#e48315', '#f59e0b', '#ec4899'], // Mais cores
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
        // [CORREÇÃO] Esconde os filtros de visualização, já que o gráfico agora é sempre de pizza.
        document.getElementById('chartVisualizationFilters').style.display = 'none';
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
     * [REMOVIDO] As funções `togglePeriodSelector` e `setupPeriodSelectors` foram removidas.
     * A interação de filtro de período foi centralizada no modal principal, que é aberto
     * ao clicar no ícone de engrenagem ou no botão "Ver Gráfico"/"Análise".
     */

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

        // [NOVO] Listener para o botão de toggle de live update
        if (liveUpdateToggle) {
            liveUpdateToggle.addEventListener('change', () => {
                if (liveUpdateToggle.checked) {
                    startLiveUpdates();
                } else {
                    stopLiveUpdates();
                }
            });
        }
    }

    /**
     * Mostra estado de erro
     */
    function showErrorState(message) {
        document.getElementById('routerNameTitle').textContent = 'Erro ao carregar dados';
        console.error(message);
    }
});
