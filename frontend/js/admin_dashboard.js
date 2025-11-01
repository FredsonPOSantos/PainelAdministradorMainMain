// Ficheiro: frontend/js/admin_dashboard.js
// [VERSÃO 13.1.3 - Lógica V13 (CSS Classes) + Correção de Timing (V14.4) + IDs Corrigidos V2]

// --- Variáveis Globais ---
let isProfileLoaded = false;
window.currentUserProfile = null;
let loadPageExternal;
window.systemSettings = null; 

// --- Funções Globais ---
const showForcePasswordChangeModal = () => {
    const changePasswordModal = document.getElementById('forceChangePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.classList.remove('hidden');
        document.querySelector('.sidebar')?.classList.add('hidden');
        document.querySelector('.main-content')?.classList.add('hidden');
    } else {
        console.error("FATAL: Modal 'forceChangePasswordModal' não encontrado (V13.1.3)!");
    }
};

// [ATUALIZADO V13] Adiciona cache busting simples para GET
const apiRequest = async (endpoint, method = 'GET', body = null) => {
    // Define a URL base da API
    const API_ADMIN_URL = `http://${window.location.hostname}:3000`;
    const token = localStorage.getItem('adminToken');
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache' // Tenta evitar cache da API
        }
    };

    let url = `${API_ADMIN_URL}${endpoint}`;

    // Adiciona timestamp para GET para evitar cache do browser (cache busting)
    if (method === 'GET') {
        url += (url.includes('?') ? '&' : '?') + `_=${Date.now()}`;
    }

    if (body instanceof FormData) {
        // Se for FormData, o browser define o Content-Type automaticamente
        options.body = body;
    } else if (body) {
        // Se for um objeto JSON
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options); 

        if (!response.ok) {
            let errorData = {};
            try {
                // Tenta extrair a mensagem de erro do JSON da API
                errorData = await response.json();
            } catch (e) {
                // Fallback se a resposta não for JSON
                errorData.message = response.statusText || `Erro HTTP ${response.status}`;
            }

            // Tratamento de erros específicos
            if (response.status === 401) {
                console.warn("Token inválido/expirado (V13.1.3). Deslogando...");
                // Limpa os dados de sessão e redireciona para o login
                localStorage.removeItem('adminToken');
                window.currentUserProfile = null;
                isProfileLoaded = false;
                window.systemSettings = null;
                window.location.href = 'admin_login.html';
                throw new Error('Não autorizado.');
            } else if (errorData.code === 'PASSWORD_CHANGE_REQUIRED') {
                console.warn("API bloqueada (V13.1.3). Troca de senha obrigatória.");
                showForcePasswordChangeModal();
                throw new Error(errorData.message || "Troca de senha obrigatória.");
            } else {
                // Outros erros (403, 404, 500, etc.)
                throw new Error(errorData.message || `Erro ${response.status}`);
            }
        }
        
        // Trata respostas sem conteúdo (ex: 204 No Content)
        if (response.status === 204) {
            return null;
        }

        // Verifica o tipo de conteúdo da resposta
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json(); // Resposta JSON
        } else {
            return await response.text() || null; // Resposta de texto (ou vazia)
        }

    } catch (error) {
        // Captura erros de rede ou os erros lançados acima
        console.error(`Erro em apiRequest (V13.1.3) ${method} ${endpoint}:`, error);
        throw error;
    }
};


// [NOVO V13.1] Função para aplicar configurações visuais (Nome, Logo, Cor)
window.applyVisualSettings = (settings) => {
    if (!settings) {
        console.warn("applyVisualSettings: Configurações não fornecidas.");
        return;
    }
    console.log("applyVisualSettings: Aplicando configurações...", settings);

    // 1. Logótipo no novo cabeçalho
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
        if (settings.logo_url) {
            const API_ADMIN_URL = `http://${window.location.hostname}:3000`;
            const logoPath = settings.logo_url.startsWith('/') ? settings.logo_url : '/' + settings.logo_url;
            const newLogoSrc = `${API_ADMIN_URL}${logoPath}?t=${Date.now()}`;
            console.log(`applyVisualSettings: Encontrado headerLogo. Alterando src para '${newLogoSrc}'`);
            headerLogo.src = newLogoSrc;
            headerLogo.alt = settings.company_name || "Logótipo";
            headerLogo.style.display = 'block';
        } else {
            console.log('applyVisualSettings: logo_url está vazio. Escondendo o logo.');
            headerLogo.style.display = 'none';
            headerLogo.src = '#';
        }
    } else {
        console.error('applyVisualSettings: Elemento #headerLogo não encontrado.');
    }

    // 2. Cor Primária (Variável CSS)
    if (settings.primary_color) {
        console.log(`applyVisualSettings: Alterando --primary-color para '${settings.primary_color}'`);
        document.documentElement.style.setProperty('--primary-color', settings.primary_color);
        
        try {
             let darkerColor = settings.primary_color;
             if (settings.primary_color.startsWith('#') && settings.primary_color.length === 7) {
                 let r = parseInt(settings.primary_color.substring(1, 3), 16);
                 let g = parseInt(settings.primary_color.substring(3, 5), 16);
                 let b = parseInt(settings.primary_color.substring(5, 7), 16);
                 r = Math.max(0, r - 30).toString(16).padStart(2, '0');
                 g = Math.max(0, g - 30).toString(16).padStart(2, '0');
                 b = Math.max(0, b - 30).toString(16).padStart(2, '0');
                 darkerColor = `#${r}${g}${b}`;
             }
             document.documentElement.style.setProperty('--primary-color-dark', darkerColor);
             console.log(`applyVisualSettings: Alterando --primary-color-dark para '${darkerColor}'`);
        } catch (colorError) {
             console.error("Erro ao calcular cor escura:", colorError);
             document.documentElement.style.setProperty('--primary-color-dark', settings.primary_color);
        }
    }

    // 3. Novas configurações de aparência
    if (settings.background_color) {
        console.log(`applyVisualSettings: Alterando --background-dark para '${settings.background_color}'`);
        document.documentElement.style.setProperty('--background-dark', settings.background_color);
    }
    if (settings.font_color) {
        console.log(`applyVisualSettings: Alterando --text-primary para '${settings.font_color}'`);
        document.documentElement.style.setProperty('--text-primary', settings.font_color);
    }
    if (settings.font_family) {
        console.log(`applyVisualSettings: Alterando --font-family para '${settings.font_family}'`);
        document.documentElement.style.setProperty('--font-family', settings.font_family);
    }
    if (settings.font_size) {
        console.log(`applyVisualSettings: Alterando --font-size para '${settings.font_size}px'`);
        document.documentElement.style.setProperty('--font-size', `${settings.font_size}px`);
    }
};


// --- [NOVO V13.1 / V14.4] ---
// Função robusta para esperar que um elemento exista no DOM antes de executar um script
const waitForElement = (selector, container, initFunction, pageName) => {
    const maxRetries = 20; // 20 tentativas * 50ms = 1000ms (1 segundo)
    const delay = 50;
    let retryCount = 0;

    const check = () => {
        // Procura o elemento dentro do container (ex: .content-area)
        const element = container.querySelector(selector);
        
        if (element) {
            // Elemento encontrado, executa a função de inicialização
            console.log(`waitForElement (V13.1.3): Elemento '${selector}' encontrado para '${pageName}'. Executando init...`);
            initFunction();
        } else if (retryCount < maxRetries) {
            // Elemento não encontrado, tenta novamente após o delay
            retryCount++;
            console.log(`waitForElement (V13.1.3): Esperando por '${selector}' (Tentativa ${retryCount}/${maxRetries})...`);
            setTimeout(check, delay);
        } else {
            // Esgotou as tentativas
            console.error(`Timeout (V13.1.3): Elemento ${selector} não encontrado após ${maxRetries * delay}ms para ${pageName}. initFunction não foi executada.`);
        }
    };
    
    check(); // Inicia a primeira verificação
};
// --- FIM V13.1 / V14.4 ---


// --- INICIALIZAÇÃO PRINCIPAL (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', async () => {
    
    console.log("DOM Carregado (V13.1.3). Iniciando Dashboard...");
    const token = localStorage.getItem('adminToken');
    if (!token) {
        console.log("Nenhum token (V13.1.3). Redirecionando.");
        window.location.href = 'admin_login.html';
        return;
    }

    // --- DOM Elements ---
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    const logoutButton = document.getElementById('logoutButton');
    const mainContentArea = document.querySelector('.content-area');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    const allNavItemsAndTitles = document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav .nav-title');
    const pageTitleElement = document.getElementById('pageTitle');
    const changePasswordModal = document.getElementById('forceChangePasswordModal');
    const changePasswordForm = document.getElementById('forceChangePasswordForm');
    const changePasswordError = document.getElementById('forceChangePasswordError');
    const changePasswordSuccess = document.getElementById('forceChangePasswordSuccess');

    // Mapeamento de inicializadores de página
    const pageInitializers = {
        'admin_home': window.initHomePage,
        'admin_hotspot': window.initHotspotPage,
        'admin_users': window.initUsersPage,
        'admin_templates': window.initTemplatesPage,
        'admin_banners': window.initBannersPage,
        'admin_campaigns': window.initCampaignsPage,
        'admin_routers': window.initRoutersPage,
        'admin_settings': window.initSettingsPage
    };

    // --- [ATUALIZADO V13.1.3] IDs de verificação para o waitForElement ---
    const pageElementIds = {
        'admin_home': '#activeCampaigns',          
        'admin_hotspot': '#hotspotFilterForm',      
        'admin_users': '#resetPasswordForm',        
        'admin_templates': '#templatesTable',       
        'admin_banners': '#bannersTable',           
        'admin_campaigns': '#campaignsTable',       
        'admin_routers': '#groupsTable',            
        'admin_settings': '#tab-perfil'             
    };
    // --- FIM V13.1.3 ---


    // --- PAGE NAVIGATION (Atualizado V13.1) ---
    const loadPage = async (pageName, linkElement) => {
        if (!isProfileLoaded) {
            console.warn(`loadPage (${pageName}) chamado antes do perfil (V13.1.3).`);
        }
        if (isProfileLoaded && window.currentUserProfile?.must_change_password) {
            console.warn(`Navegação ${pageName} bloqueada (V13.1.3): Senha.`);
            showForcePasswordChangeModal();
            return;
        }

        console.log(`loadPage (V13.1.3): Carregando ${pageName}...`);
        
        navLinks.forEach(link => link.classList.remove('active'));
        let currentTitle = pageName; 
        if (linkElement) {
            linkElement.classList.add('active');
            const txt = (linkElement.textContent || '').trim().replace(/[\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
            currentTitle = txt || pageName;
        } else {
            const curr = document.querySelector(`.sidebar-nav .nav-item[data-page="${pageName}"]`);
            if (curr) {
                curr.classList.add('active');
                const txt = (curr.textContent || '').trim().replace(/[\u{1F300}-\u{1F5FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                currentTitle = txt || pageName;
            }
        }
        
        if (pageTitleElement) pageTitleElement.textContent = currentTitle;

        try {
            const response = await fetch(`pages/${pageName}.html?_=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Página ${pageName}.html não encontrada (${response.status})`);
            }
            if (mainContentArea) {
                mainContentArea.innerHTML = await response.text();
            } else {
                console.error("'.content-area' (V13.1.3) não encontrado.");
                return;
            }

            const initFunction = pageInitializers[pageName];
            const elementToWaitFor = pageElementIds[pageName];

            if (typeof initFunction === 'function' && elementToWaitFor && mainContentArea) {
                waitForElement(elementToWaitFor, mainContentArea, initFunction, pageName);
            } else if (typeof initFunction !== 'function') {
                console.warn(`Init function (V13.1.3) ${pageName} não encontrada.`);
            }
            else if (!elementToWaitFor) {
                 console.error(`ID de verificação (V13.1.3) para ${pageName} não definido em pageElementIds.`);
            }

        } catch (error) {
            console.error(`Erro loadPage ${pageName} (V13.1.3):`, error);
            if (mainContentArea) mainContentArea.innerHTML = `<h2>Erro ao carregar ${pageName}.</h2><p>${error.message}.</p>`;
        }
    };
    loadPageExternal = loadPage;

    // --- USER PROFILE & AUTH ---
    const fetchUserProfile = async () => {
        isProfileLoaded = false;
        window.currentUserProfile = null;
        try {
            console.log("fetchUserProfile (V13.6.1): Buscando perfil e permissões...");
            const data = await apiRequest('/api/admin/profile');

            if (!data || !data.profile || !data.profile.role || !data.profile.permissions) {
                throw new Error("Perfil inválido ou sem permissões (V13.6.1).");
            }

            console.log(`fetchUserProfile (V13.6.1): Perfil recebido (Role: ${data.profile.role}).`);
            window.currentUserProfile = data.profile;
            isProfileLoaded = true;

            // Preenche os elementos no novo cabeçalho
            if (userNameElement) userNameElement.textContent = data.profile.email;
            if (userRoleElement) userRoleElement.textContent = data.profile.role.toUpperCase();

            // [NOVO] Lógica para o nome de boas-vindas
            const userFirstNameElement = document.getElementById('userFirstName');
            if (userFirstNameElement) {
                // Por enquanto, o campo 'nome_completo' não existe. Usaremos um fallback.
                if (data.profile.nome_completo) {
                    const firstName = data.profile.nome_completo.split(' ')[0];
                    userFirstNameElement.textContent = firstName;
                } else {
                    // Fallback se não houver nome completo, esconde a mensagem
                    const welcomeMessage = userFirstNameElement.closest('.welcome-message');
                    if(welcomeMessage) welcomeMessage.style.display = 'none';
                }
            }

            if (data.profile.must_change_password) {
                console.log("fetchUserProfile (V13.6.1): Senha obrigatória.");
                showForcePasswordChangeModal();
                return false;
            }

            console.log("fetchUserProfile (V13.6.1): Perfil e permissões OK.");
            return true;

        } catch (error) {
            console.error("Falha CRÍTICA ao buscar perfil (V13.6.1):", error.message);
            isProfileLoaded = false;
            window.currentUserProfile = null;
            window.systemSettings = null;
            if(mainContentArea) mainContentArea.innerHTML = '<h2>Erro ao carregar perfil. Recarregue a página.</h2>';
            document.querySelector('.sidebar')?.classList.add('hidden');
            document.querySelector('.main-content')?.classList.add('hidden');

            if (!error.message || (!error.message.includes('Não autorizado') && !error.message.includes('obrigatória'))) {
                setTimeout(() => {
                    localStorage.removeItem('adminToken');
                    window.location.href = 'admin_login.html';
                }, 4000);
            }
            return false;
        }
    };

    // --- [LÓGICA V13.6.1] applyMenuPermissions (Baseada em Permissões) ---
    const applyMenuPermissions = (permissions) => {
        console.log(`applyMenuPermissions (V13.6.1): Aplicando permissões...`, permissions);

        if (!permissions) {
            console.error("applyMenuPermissions (V13.6.1): Objeto de permissões não fornecido!");
            return;
        }

        // Mapeia cada item de menu para a permissão de leitura necessária
        const menuPermissionMap = {
            'admin_home': 'dashboard.read',
            'admin_hotspot': 'hotspot.read',
            'admin_campaigns': 'campaigns.read',
            'admin_templates': 'templates.read',
            'admin_banners': 'banners.read',
            'admin_routers': 'routers.read',
            'admin_users': 'users.read',
            'admin_settings': 'settings.read' // Permissão genérica para a página de configurações
        };

        allNavItemsAndTitles.forEach(el => {
            if (!el.classList.contains('nav-item')) {
                el.style.removeProperty('display');
                return; // Se não for um nav-item, não aplicamos lógica de permissão diretamente
            }

            const page = el.getAttribute('data-page');
            const requiredPermission = menuPermissionMap[page];

            // Se não há uma permissão mapeada, o item é considerado público (como o Dashboard)
            if (!requiredPermission || permissions[requiredPermission]) {
                el.style.removeProperty('display');
            } else {
                el.style.display = 'none';
            }
        });

        // Passagem 2: Esconde títulos se todos os filhos estiverem escondidos
        const navTitles = document.querySelectorAll('.sidebar-nav .nav-title');
        navTitles.forEach(titleEl => {
            let nextEl = titleEl.nextElementSibling;
            let hasVisibleChild = false;
            while (nextEl && !nextEl.classList.contains('nav-title')) {
                if (nextEl.classList.contains('nav-item') && nextEl.style.display !== 'none') {
                    hasVisibleChild = true;
                    break;
                }
                nextEl = nextEl.nextElementSibling;
            }

            if (!hasVisibleChild) {
                titleEl.style.display = 'none';
            } else {
                titleEl.style.removeProperty('display');
            }
        });

        console.log("applyMenuPermissions (V13.6.1): Permissões do menu aplicadas.");
    };


    // --- Logout ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            console.log("Logout (V13.1.3).");
            localStorage.removeItem('adminToken');
            window.currentUserProfile = null;
            isProfileLoaded = false;
            window.systemSettings = null;
            window.location.href = 'admin_login.html';
        });
    } else {
        console.warn("Botão logout (V13.1.3) não encontrado.");
    }

    // --- Navegação ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if(page) loadPage(page, link);
            else console.warn("Click em item de menu sem 'data-page' (V13.1.3).");
        });
    });

    // --- Modal Troca Senha ---
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Form troca senha submetido (V13.1.3).");
            
            if(changePasswordError) changePasswordError.textContent = '';
            if(changePasswordSuccess) changePasswordSuccess.textContent = '';
            
            const btn = changePasswordForm.querySelector('button[type="submit"]');
            if(btn) { btn.disabled = true; btn.textContent = 'A processar...'; }

            const currIn = document.getElementById('currentTemporaryPassword');
            const newIn = document.getElementById('newPassword');

            if(!currIn || !newIn) {
                 if(changePasswordError) changePasswordError.textContent = "Erro interno (campos não encontrados).";
                 if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
                 return;
            }

            const curr = currIn.value;
            const nv = newIn.value;

            if (nv.length < 6) {
                if(changePasswordError) changePasswordError.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
                if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
                return;
            }

            try {
                const result = await apiRequest('/api/admin/profile/change-own-password', 'POST', {
                    currentPassword: curr,
                    newPassword: nv
                });
                
                if(changePasswordSuccess) changePasswordSuccess.textContent = (result.message || "Senha alterada com sucesso!") + " A redirecionar para o login...";
                
                // Redireciona para o login após o sucesso
                setTimeout(() => {
                    localStorage.removeItem('adminToken');
                    window.currentUserProfile = null; isProfileLoaded = false; window.systemSettings = null;
                    window.location.href = 'admin_login.html';
                }, 4000);

            } catch (error) {
                if(changePasswordError) changePasswordError.textContent = `Erro: ${error.message || 'Falha ao alterar a senha.'}`;
                if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
            }
        });
    } else {
        console.warn("Form 'forceChangePasswordForm' (V13.1.3) não encontrado.");
    }

    // --- [REESTRUTURADO V13] INICIALIZAÇÃO ---
    console.log("Dashboard (V13.1.3): Iniciando sequência...");
    
    // 1. Busca o perfil E ESPERA
    const profileOK = await fetchUserProfile();
    console.log(`Dashboard (V13.1.3): Perfil carregado? ${profileOK}`);

    if (!profileOK) {
        // Se o perfil falhar (token inválido) ou precisar de troca de senha,
        // a inicialização é interrompida aqui.
        console.log("Dashboard (V13.1.3): Inicialização INTERROMPIDA (fetchUserProfile falhou ou bloqueou).");
        return;
    }

    // 2. Busca as configurações gerais
    try {
        console.log("Dashboard (V13.1.3): Buscando configurações gerais...");
        const settings = await apiRequest('/api/settings/general');
        if (settings) {
             window.systemSettings = settings; 
             applyVisualSettings(settings); // Aplica nome, logo e cor
             console.log("Dashboard (V13.1.3): Configurações visuais aplicadas.");
        } else {
             console.warn("Dashboard (V13.1.3): Configurações gerais não retornadas pela API.");
             window.systemSettings = {}; 
        }
    } catch (settingsError) {
        console.error("Dashboard (V13.1.3): Erro ao buscar/aplicar configurações gerais:", settingsError);
        window.systemSettings = {}; 
    }

    // 3. [LÓGICA V13.6.1] Aplica permissões ao menu
    applyMenuPermissions(window.currentUserProfile.permissions);


    // 4. Carrega a página inicial
    console.log("Dashboard (V13.1.3): Carregando página inicial 'admin_home'...");
    const homeLink = document.querySelector('.sidebar-nav .nav-item[data-page="admin_home"]');
    if (homeLink) {
        loadPage('admin_home', homeLink);
    } else {
        console.error("Link 'admin_home' (V13.1.3) não encontrado!");
        loadPage('admin_home', null); // Tenta carregar mesmo assim
    }

    console.log("Dashboard (V13.1.3): Inicialização concluída com sucesso.");
}); // Fim do DOMContentLoaded

