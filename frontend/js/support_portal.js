// Ficheiro: frontend/js/support_portal.js
// Descrição: Controlador para a página dedicada de suporte (Standalone).

document.addEventListener('DOMContentLoaded', async () => {
    console.log("A inicializar Portal de Suporte Dedicado...");

    // 1. Verificar Autenticação
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin_login.html';
        return;
    }

    // 2. Carregar Perfil do Utilizador (Necessário para permissões e ID)
    try {
        const response = await apiRequest('/api/admin/profile');
        if (response.success) {
            window.currentUserProfile = response.data;
            document.getElementById('portalUserName').textContent = window.currentUserProfile.email;
        } else {
            throw new Error("Falha ao carregar perfil.");
        }
    } catch (error) {
        console.error("Erro de autenticação:", error);
        window.location.href = 'admin_login.html';
        return;
    }

    // 3. Carregar o HTML da página de suporte original para dentro do container
    // Isso permite reutilizar o layout definido em pages/support.html
    const container = document.getElementById('support-page-container');
    const htmlResponse = await fetch('/pages/support.html'); // [CORREÇÃO] Caminho absoluto
    container.innerHTML = await htmlResponse.text();

    // 4. Carregar e executar a lógica do suporte
    // Carregamos dinamicamente o script original support.js para reutilizar toda a lógica
    const script = document.createElement('script');
    script.src = '/js/support.js'; // [CORREÇÃO] Caminho absoluto
    script.onload = () => {
        // Quando o script carregar, inicializamos manualmente
        if (window.initSupportPage) {
            // [NOVO] Passa o ID do ticket da URL hash para a função de inicialização
            const ticketIdFromHash = window.location.hash.substring(1);
            window.initSupportPage({ ticketId: ticketIdFromHash });
        }
    };
    document.body.appendChild(script);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = 'admin_login.html';
    });
});

// Mock da função showPagePreloader se não existir (pois admin_dashboard.js não está presente)
if (!window.showPagePreloader) {
    window.showPagePreloader = (msg) => console.log(`[Loading] ${msg}`);
    window.hidePagePreloader = () => console.log(`[Loading] Concluído.`);
}