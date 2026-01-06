/**
 * Ficheiro: frontend/js/utils.js
 * Descrição: Contém funções utilitárias globais para o painel de administração.
 */

/**
 * Formata um valor em bits por segundo (bps) para um formato legível (Kbps, Mbps, Gbps).
 * Ideal para exibir velocidade de rede.
 * @param {number | null | undefined} bits - O valor em bits por segundo.
 * @returns {string} A string formatada.
 */
function formatBitsPerSecond(bits) {
    if (bits === null || bits === undefined) return 'N/A';
    if (bits < 1000) return bits.toFixed(0) + ' bps';
    if (bits < 1000 * 1000) return (bits / 1000).toFixed(2) + ' Kbps';
    if (bits < 1000 * 1000 * 1000) return (bits / (1000 * 1000)).toFixed(2) + ' Mbps';
    return (bits / (1000 * 1000 * 1000)).toFixed(2) + ' Gbps';
}

/**
 * Formata um valor em bytes para um formato legível (KB, MB, GB).
 * Ideal para exibir tamanho de ficheiro ou total de dados transferidos.
 * @param {number | null | undefined} bytes - O valor em bytes.
 * @returns {string} A string formatada.
 */
function formatBytes(bytes) {
    if (bytes === null || bytes === undefined || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * [NOVO] Formata segundos em um formato legível (dias, horas, minutos).
 * @param {number} seconds - O tempo em segundos.
 * @returns {string} A string formatada (ex: "5d 12h 30m").
 */
function formatUptime(seconds) {
    if (!seconds || seconds < 0) return 'N/A';
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
 * [NOVO] Aplica um tema visual ao corpo do documento.
 * @param {string} theme - O nome do tema (ex: 'rota', 'light').
 */
function applyTheme(theme) {
    // Lista de todas as classes de tema para garantir que apenas uma seja aplicada
    const themeClasses = ['theme-rota', 'theme-cidade-sol', 'theme-expresso', 'theme-oceano', 'theme-light', 'theme-contrast', 'theme-teal', 'theme-gray', 'theme-vscode', 'theme-windows11', 'theme-linux', 'theme-bluelight'];
    document.body.classList.remove(...themeClasses);

    // Adiciona a classe do novo tema, se não for o padrão
    if (theme && theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
        console.log(`[applyTheme] Tema '${theme}' aplicado.`);
    }
}

/**
 * [NOVO] Realiza uma requisição padronizada para a API do backend.
 * Lida com autenticação, tratamento de erros e parsing de JSON.
 * @param {string} endpoint O endpoint da API (ex: '/api/users').
 * @param {string} method O método HTTP (GET, POST, PUT, DELETE).
 * @param {object|null} body O corpo da requisição para POST/PUT.
 * @returns {Promise<object>} A resposta da API em formato JSON.
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const API_ADMIN_URL = `http://${window.location.hostname}:3000`;
    const token = localStorage.getItem('adminToken');

    // Não redireciona se já estiver numa página de autenticação
    if (!token && !window.location.pathname.includes('login') && !window.location.pathname.includes('reset') && !window.location.pathname.includes('forgot')) {
        console.error("Token não encontrado, a redirecionar para o login.");
        window.location.href = '/admin_login.html';
        throw new Error("Autenticação necessária.");
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
        }
    };

    if (body) {
        if (body instanceof FormData) {
            // Se for FormData (upload de arquivos), o navegador define o Content-Type automaticamente
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch(`${API_ADMIN_URL}${endpoint}`, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Erro desconhecido na API.');
    }

    if (response.status === 204) return { success: true, data: null };
    return response.json();
}
