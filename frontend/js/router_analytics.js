document.addEventListener('DOMContentLoaded', () => {
    const routerNameTitle = document.getElementById('routerNameTitle');
    
    // 1. Obter o ID do roteador a partir da URL
    // Ex: Se a URL for /monitoring/router/45, isto irá extrair o "45"
    const pathParts = window.location.pathname.split('/');
    const routerId = window.location.hash.substring(1);


    if (!routerId || isNaN(routerId)) {
        routerNameTitle.textContent = 'ID do Roteador Inválido';
        return;
    }

    // Opções de configuração para o gráfico de CPU
    const chartOptions = {
        chart: {
            type: 'area',
            height: 350,
            zoom: {
                enabled: true // Permite zoom com o rato
            },
            toolbar: {
                show: true
            }
        },
        series: [{
            name: 'CPU Load',
            data: [] // Os dados virão da API
        }],
        xaxis: {
            type: 'datetime',
            labels: {
                style: {
                    colors: '#a0a0a0' // Cor dos labels do eixo X
                }
            }
        },
        yaxis: {
            title: {
                text: 'Uso de CPU (%)'
            },
            labels: {
                style: {
                    colors: '#a0a0a0' // Cor dos labels do eixo Y
                }
            }
        },
        dataLabels: {
            enabled: false // Desativa os números em cima de cada ponto
        },
        stroke: {
            curve: 'smooth' // Linha do gráfico suavizada
        },
        tooltip: {
            x: {
                format: 'dd MMM yyyy - HH:mm'
            }
        },
        theme: {
            mode: 'dark' // Tema escuro para o gráfico
        }
    };

    const cpuChart = new ApexCharts(document.querySelector("#cpuChart"), chartOptions);
    cpuChart.render();

    // 2. Função para buscar os dados da API e atualizar o gráfico
    async function fetchCpuHistory(range = '1h') {
        try {
            // Atualiza o título para indicar que está a carregar
            cpuChart.updateOptions({
                title: { text: `A carregar dados da última ${range}...`, align: 'center' }
            });

            // CORREÇÃO: Usa a função global 'apiRequest' que já trata da URL da API e da autenticação.
            const response = await apiRequest(`/api/monitoring/router/${routerId}/cpu-history?range=${range}`);
            
            if (!response.success) {
                throw new Error(response.message || 'Falha ao carregar dados da API.');
            }
            const data = response.data;

            // Atualiza a série do gráfico com os novos dados
            cpuChart.updateSeries([{
                name: 'CPU Load',
                data: data
            }]);

            // Limpa o título de "carregando"
            cpuChart.updateOptions({ title: { text: '' } });

        } catch (error) {
            console.error('Falha ao buscar histórico de CPU:', error);
            cpuChart.updateOptions({
                title: { text: 'Erro ao carregar dados.', align: 'center', style: { color: '#ff6b6b' } }
            });
        }
    }

    // 3. Busca inicial dos dados
    fetchCpuHistory(); 

    // (Opcional) No futuro, podemos adicionar botões de filtro (1h, 6h, 24h)
    // que chamariam a função fetchCpuHistory com diferentes ranges.
});
