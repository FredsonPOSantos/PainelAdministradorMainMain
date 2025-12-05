// Ficheiro: frontend/js/router_analytics_new.js
// Página de Análise Detalhada de Roteadores com Gráficos Interativos

document.addEventListener('DOMContentLoaded', () => {
    // ===== VARIÁVEIS GLOBAIS =====
    const routerId = window.location.hash.substring(1);
    let currentRange = '1h';
    let chartsInstances = {};
    let metricsData = {};

    // ===== VALIDAÇÃO INICIAL =====
    if (!routerId || isNaN(routerId)) {
        document.getElementById('routerNameTitle').textContent = 'ID do Roteador Inválido';
        return;
    }

    // ===== INICIALIZAÇÃO =====
    initializeCharts();
    loadMetrics(currentRange);
    setupEventListeners();

    // ===== FUNÇÕES PRINCIPAIS =====

    /**
     * Inicializa os gráficos vazios
     */
    function initializeCharts() {
        const commonOptions = {
            chart: {
                type: 'area',
                height: 350,
                zoom: { enabled: true },
                toolbar: { show: true },
                animations: { enabled: true }
            },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            tooltip: {
                x: { format: 'dd MMM yyyy - HH:mm' },
                theme: 'dark'
            },
            theme: { mode: 'dark' },
            xaxis: {
                type: 'datetime',
                labels: { 
                    style: { colors: '#a0a0a0' },
                    // CORREÇÃO: Garante que o gráfico interprete os dados como UTC e exiba no fuso horário local.
                    datetimeUTC: false
                }
            },
            yaxis: {
                labels: { style: { colors: '#a0a0a0' } }
            }
        };

        // Gráfico de CPU
        const cpuOptions = {
            ...commonOptions,
            series: [{ name: 'CPU Load (%)', data: [] }],
            yaxis: {
                ...commonOptions.yaxis,
                title: { text: 'Uso de CPU (%)' },
                min: 0,
                max: 100
            },
            colors: ['#e48315']
        };
        chartsInstances.cpu = new ApexCharts(document.querySelector("#cpuChart"), cpuOptions);
        chartsInstances.cpu.render();

        // Gráfico de Memória
        const memoryOptions = {
            ...commonOptions,
            series: [{ name: 'Memory Usage (%)', data: [] }],
            yaxis: {
                ...commonOptions.yaxis,
                title: { text: 'Uso de Memória (%)' },
                min: 0,
                max: 100
            },
            colors: ['#3b82f6']
        };
        chartsInstances.memory = new ApexCharts(document.querySelector("#memoryChart"), memoryOptions);
        chartsInstances.memory.render();

        // Gráfico de Tráfego de Rede
        const trafficOptions = {
            ...commonOptions,
            series: [{ name: 'Network Traffic', data: [] }],
            yaxis: {
                ...commonOptions.yaxis,
                title: { text: 'Tráfego (Mbps)' }
            },
            colors: ['#10b981']
        };
        chartsInstances.traffic = new ApexCharts(document.querySelector("#trafficChart"), trafficOptions);
        chartsInstances.traffic.render();
    }

    /**
     * Carrega as métricas da API
     */
    async function loadMetrics(range) {
        try {
            // Mostrar estado de carregamento
            showLoadingState();

            const response = await apiRequest(`/api/monitoring/router/${routerId}/metrics?range=${range}`);

            if (!response.success) {
                throw new Error(response.message || 'Erro ao carregar métricas');
            }

            metricsData = response.data;

            // Atualizar header
            document.getElementById('routerNameTitle').textContent = metricsData.routerName;
            document.getElementById('routerIpDisplay').textContent = `IP: ${metricsData.routerIp}`;

            // Atualizar gráficos
            updateCharts();

            // Atualizar cards de estatísticas
            updateStatCards();
            loadClientsData(); // NOVO: Carregar dados de clientes

        } catch (error) {
            console.error('Erro ao carregar métricas:', error);
            showErrorState(error.message);
        }
    }

    /**
     * Atualiza os gráficos com os dados carregados
     */
    function updateCharts() {
        // CPU
        if (metricsData.cpu && metricsData.cpu.data) {
            chartsInstances.cpu.updateSeries([{
                name: 'CPU Load (%)',
                data: metricsData.cpu.data
            }]);
        }

        // Memória
        if (metricsData.memory && metricsData.memory.data) {
            chartsInstances.memory.updateSeries([{
                name: 'Memory Usage (%)',
                data: metricsData.memory.data
            }]);
        }

        // Tráfego
        if (metricsData.traffic && metricsData.traffic.data) {
            chartsInstances.traffic.updateSeries([{
                name: 'Network Traffic',
                data: metricsData.traffic.data
            }]);
        }
    }

    /**
     * Atualiza os cards de estatísticas
     */
    function updateStatCards() {
        // CPU
        if (metricsData.cpu && metricsData.cpu.stats) {
            const cpuStats = metricsData.cpu.stats;
            document.getElementById('cpuCurrent').textContent = cpuStats.current.toFixed(2) + '%';
            document.getElementById('cpuMin').textContent = cpuStats.min.toFixed(2);
            document.getElementById('cpuMax').textContent = cpuStats.max.toFixed(2);
            document.getElementById('cpuAvg').textContent = cpuStats.avg.toFixed(2);
        }

        // Memória
        if (metricsData.memory && metricsData.memory.stats) {
            const memStats = metricsData.memory.stats;
            document.getElementById('memoryCurrent').textContent = memStats.current.toFixed(2) + '%';
            document.getElementById('memoryMin').textContent = memStats.min.toFixed(2);
            document.getElementById('memoryMax').textContent = memStats.max.toFixed(2);
            document.getElementById('memoryAvg').textContent = memStats.avg.toFixed(2);
        }

        // Tráfego
        if (metricsData.traffic && metricsData.traffic.stats) {
            const trafficStats = metricsData.traffic.stats;
            document.getElementById('trafficCurrent').textContent = formatTraffic(trafficStats.current);
            document.getElementById('trafficMin').textContent = formatTraffic(trafficStats.min);
            document.getElementById('trafficMax').textContent = formatTraffic(trafficStats.max);
            document.getElementById('trafficAvg').textContent = formatTraffic(trafficStats.avg);
        }
    }

    /**
     * Carrega dados de clientes (DHCP e Hotspot)
     */
    async function loadClientsData() {
        try {
            const response = await apiRequest(`/api/monitoring/router/${routerId}/clients`);
            if (!response.success) {
                throw new Error(response.message);
            }

            const clientsData = response.data.clients;
            
            document.getElementById('dhcpCount').textContent = clientsData.dhcp?.count || 0;
            document.getElementById('hotspotCount').textContent = clientsData.hotspot?.count || 0;

        } catch (error) {
            console.error('Erro ao carregar dados de clientes:', error);
            document.getElementById('dhcpCount').textContent = 'Erro';
            document.getElementById('hotspotCount').textContent = 'Erro';
        }
    }


    /**
     * Formata valores de tráfego
     */
    function formatTraffic(value) {
        if (value >= 1000) {
            return (value / 1000).toFixed(2) + ' Gbps';
        }
        return value.toFixed(2) + ' Mbps';
    }

    /**
     * Mostra estado de carregamento
     */
    function showLoadingState() {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.textContent = 'Carregando...';
        });
    }

    /**
     * Mostra estado de erro
     */
    function showErrorState(message) {
        document.getElementById('routerNameTitle').textContent = 'Erro ao carregar dados';
        document.querySelectorAll('.stat-value').forEach(el => {
            el.textContent = 'Erro';
        });
    }

    /**
     * Configura os event listeners
     */
    function setupEventListeners() {
        // Botões de filtro de tempo
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.target.id === 'applyCustomDate') {
                    handleCustomDateFilter();
                } else {
                    const range = e.target.getAttribute('data-range');
                    if (range) {
                        setActiveFilter(e.target);
                        currentRange = range;
                        loadMetrics(range);
                    }
                }
            });
        });

        // Botões de tela cheia
        document.getElementById('cpuFullscreen').addEventListener('click', () => {
            openFullscreenChart('CPU', chartsInstances.cpu);
        });

        document.getElementById('memoryFullscreen').addEventListener('click', () => {
            openFullscreenChart('Memória', chartsInstances.memory);
        });

        document.getElementById('trafficFullscreen').addEventListener('click', () => {
            openFullscreenChart('Tráfego de Rede', chartsInstances.traffic);
        });

        // Cards clicáveis
        document.getElementById('cpuCard').addEventListener('click', () => {
            openFullscreenChart('CPU', chartsInstances.cpu);
        });

        document.getElementById('memoryCard').addEventListener('click', () => {
            openFullscreenChart('Memória', chartsInstances.memory);
        });

        document.getElementById('trafficCard').addEventListener('click', () => {
            openFullscreenChart('Tráfego de Rede', chartsInstances.traffic);
        });

        // Definir datas padrão para filtro personalizado
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        document.getElementById('customStartDate').valueAsDate = yesterday;
        document.getElementById('customEndDate').valueAsDate = today;
    }

    /**
     * Define o botão de filtro ativo
     */
    function setActiveFilter(button) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
    }

    /**
     * Manipula o filtro de data personalizada
     */
    function handleCustomDateFilter() {
        const startDate = document.getElementById('customStartDate').value;
        const endDate = document.getElementById('customEndDate').value;

        if (!startDate || !endDate) {
            alert('Por favor, selecione ambas as datas');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('A data de início não pode ser posterior à data de fim');
            return;
        }

        // Calcular o range em formato Flux
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end - start;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        currentRange = `${diffDays}d`;
        loadMetrics(currentRange);

        // Remover ativo de todos os botões
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    /**
     * Abre um gráfico em tela cheia
     */
    window.openFullscreenChart = function(title, chartInstance) {
        const modal = document.getElementById('fullscreenModal');
        const fullscreenChart = document.getElementById('fullscreenChart');

        // Limpar conteúdo anterior
        fullscreenChart.innerHTML = '';

        // Criar novo container para o gráfico
        const chartDiv = document.createElement('div');
        chartDiv.id = 'fullscreenChartContainer';
        chartDiv.style.width = '100%';
        chartDiv.style.height = '100%';
        fullscreenChart.appendChild(chartDiv);

        // Criar nova instância do gráfico em tela cheia
        const fullscreenOptions = {
            ...chartInstance.opts,
            chart: {
                ...chartInstance.opts.chart,
                height: window.innerHeight - 100
            }
        };

        const fullscreenChartInstance = new ApexCharts(chartDiv, fullscreenOptions);
        fullscreenChartInstance.render();

        // Mostrar modal
        modal.classList.remove('hidden');

        // Redimensionar ao mudar o tamanho da janela
        window.addEventListener('resize', () => {
            fullscreenChartInstance.updateOptions({
                chart: { height: window.innerHeight - 100 }
            });
        });
    };

    /**
     * Fecha o gráfico em tela cheia
     */
    window.closeFullscreen = function() {
        const modal = document.getElementById('fullscreenModal');
        modal.classList.add('hidden');
    };

    // Fechar modal ao clicar fora
    document.getElementById('fullscreenModal').addEventListener('click', (e) => {
        if (e.target.id === 'fullscreenModal') {
            closeFullscreen();
        }
    });
});
