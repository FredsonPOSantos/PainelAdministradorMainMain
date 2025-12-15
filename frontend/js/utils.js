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
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_ADMIN_URL}${endpoint}`, options);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Erro desconhecido na API.');
    }

    if (response.status === 204) return { success: true, data: null };
    return response.json();
}
