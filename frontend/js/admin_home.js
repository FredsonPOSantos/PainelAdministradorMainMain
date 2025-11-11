// Ficheiro: js/admin_home.js
if (window.initHomePage) {
    console.warn("Tentativa de carregar admin_home.js múltiplas vezes.");
} else {
    window.initHomePage = () => {
        console.log("A inicializar a página principal do Dashboard (V1 - Estável)...");
        
        // Função para buscar e preencher os dados de um card específico
        const fetchCardData = async (endpoint, totalId, activeId = null, inactiveId = null) => {
            try {
                const response = await apiRequest(endpoint);
                const data = response.data;
                
                if (document.getElementById(totalId)) {
                    document.getElementById(totalId).textContent = data.length;
                }

                if (activeId) {
                    const activeCount = data.filter(item => item.is_active).length;
                    const activeElement = document.getElementById(activeId);
                    if (activeElement) activeElement.textContent = activeCount;
                }

                if (inactiveId) {
                    const inactiveCount = data.filter(item => !item.is_active).length;
                    const inactiveElement = document.getElementById(inactiveId);
                    if (inactiveElement) {
                        inactiveElement.textContent = inactiveCount;
                    }
                }

            } catch (error) {
                console.error(`Erro ao carregar dados para ${totalId}:`, error);
                if (document.getElementById(totalId)) {
                    document.getElementById(totalId).textContent = 'Erro';
                }
            }
        };

        // Função para buscar dados de utilizadores do hotspot
        const fetchHotspotUsers = async () => {
            try {
                const response = await apiRequest('/api/hotspot/total-users');
                // [CORRIGIDO] A API retorna um objeto aninhado { success: true, data: { total: X, last30days: Y } }
                // É preciso aceder a response.data.data
                const stats = response.data.data;
                // [CORRIGIDO] Usa os IDs corretos do HTML e preenche ambos os campos
                const totalElement = document.getElementById('usersTotal');
                const last30DaysElement = document.getElementById('usersLast30Days');

                if (totalElement) totalElement.textContent = stats.total;
                if (last30DaysElement) last30DaysElement.textContent = stats.last30days;

            } catch (error) {
                console.error("Erro ao carregar total de utilizadores do hotspot:", error);
                // [CORRIGIDO] Atualiza o elemento correto em caso de erro
                const totalElement = document.getElementById('usersTotal');
                if (totalElement) totalElement.textContent = 'Erro';
                const last30DaysElement = document.getElementById('usersLast30Days');
                if (last30DaysElement) last30DaysElement.textContent = 'Erro';
            }
        };

        // Inicia o carregamento de todos os dados em paralelo
        fetchCardData('/api/campaigns', 'campaignsTotal', 'campaignsActive', 'campaignsInactive');
        fetchCardData('/api/banners', 'bannersTotal', 'bannersActive', 'bannersInactive');
        fetchCardData('/api/templates', 'templatesTotal');
        fetchHotspotUsers();
    };
}
