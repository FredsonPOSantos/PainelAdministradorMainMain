// Ficheiro: js/admin_home.js
if (window.initHomePage) {
    console.warn("Tentativa de carregar admin_home.js múltiplas vezes. A segunda execução foi ignorada.");
} else {
    window.initHomePage = () => {
        console.log("A inicializar a página principal do Dashboard (V2)...");

        const fetchDashboardData = async () => {
            try {
                // [MODIFICADO] Busca os novos dados do dashboard em paralelo
                // Removidas as chamadas para /api/routers e /api/routers/groups
                const [campaigns, banners, templates, usersCount] = await Promise.all([
                    apiRequest('/api/campaigns'),
                    apiRequest('/api/banners'),
                    apiRequest('/api/templates'),
                    apiRequest('/api/hotspot/total-users') // [NOVO] Endpoint de contagem
                ]);

                // Atualiza os cartões com os dados recebidos

                // Banners
                document.getElementById('totalBanners').textContent = banners.length;

                // Campanhas
                const activeCampaignsCount = campaigns.filter(c => c.is_active).length;
                document.getElementById('activeCampaigns').textContent = activeCampaignsCount;

                // [NOVO] Templates
                document.getElementById('totalTemplates').textContent = templates.length;

                // [NOVO] Utilizadores
                document.getElementById('totalUsers').textContent = usersCount.count;

            } catch (error) {
                console.error("Erro ao carregar dados do dashboard:", error);
                // Define um valor de erro nos cartões se a API falhar
                document.querySelectorAll('.stat-card-value').forEach(el => {
                    if (el.textContent === '...') { // Só atualiza se ainda não foi preenchido
                        el.textContent = 'Erro';
                    }
                });
            }
        };
        
        // Adiciona funcionalidade aos botões de atalho rápido
        document.querySelectorAll('.quick-link-btn').forEach(button => {
            button.addEventListener('click', () => {
                const page = button.getAttribute('data-page');
                const correspondingNavLink = document.querySelector(`.nav-item[data-page="${page}"]`);
                if (window.loadPageExternal && correspondingNavLink) {
                    window.loadPageExternal(page, correspondingNavLink);
                }
            });
        });

        fetchDashboardData();
    };
}
