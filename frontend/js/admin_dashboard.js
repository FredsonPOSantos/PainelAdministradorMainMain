// Ficheiro: frontend/js/admin_dashboard.js
// [VERSÃO 13.1.3 - Lógica V13 (CSS Classes) + Correção de Timing (V14.4) + IDs Corrigidos V2]

// --- Variáveis Globais ---
let isProfileLoaded = false;
window.currentUserProfile = null;
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
        console.log(`[apiRequest] Recebida resposta para ${endpoint} com status: ${response.status}`);
        
        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {
                errorData.message = `O servidor respondeu com um erro (${response.status}) mas a resposta não pôde ser lida.`;
                console.error(`[apiRequest] Erro de parsing JSON para ${endpoint}`, e);
            }

            // Tratamento de erros específicos
            if (response.status === 401) {
                console.warn("Token inválido/expirado (V13.1.3). Deslogando...");
                localStorage.removeItem('adminToken');
                window.currentUserProfile = null;
                isProfileLoaded = false;
                window.systemSettings = null;
                window.location.href = 'admin_login.html';
                throw new Error('Não autorizado.'); // Ainda lança para redirecionamento crítico
            } else if (errorData.code === 'PASSWORD_CHANGE_REQUIRED') {
                console.warn("API bloqueada (V13.1.3). Troca de senha obrigatória.");
                showForcePasswordChangeModal();
                throw new Error(errorData.message || "Troca de senha obrigatória."); // Ainda lança para modal crítico
            } else {
                // Outros erros (403, 404, 500, etc.) - Retorna um objeto de erro estruturado
                return {
                    success: false,
                    message: errorData.message || `Erro ${response.status}`,
                    status: response.status,
                    code: errorData.code // Se houver um código de erro específico da API
                };
            }
        }
        
        // Trata respostas sem conteúdo (ex: 204 No Content)
        if (response.status === 204) {
            return { success: true, data: null, message: "Operação realizada com sucesso." };
        }

        // Verifica o tipo de conteúdo da resposta
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            console.log(`[apiRequest] Resposta para ${endpoint} é JSON. A processar...`);
            const data = await response.json();
            const returnObject = { success: true, data: data, message: data.message || "Operação realizada com sucesso." };
            console.log(`[apiRequest] A retornar para ${endpoint}:`, returnObject);
            return returnObject;
        } else {
            const textData = await response.text();
            return { success: true, data: textData || null, message: "Operação realizada com sucesso." };
        }

    } catch (error) {
        // Este bloco 'catch' captura erros de rede (ex: servidor offline) ou erros de parsing do JSON.
        console.error(`[apiRequest] FALHA CRÍTICA (rede/fetch) para ${method} ${endpoint}:`, error);
        return {
            success: false,
            message: 'Falha de comunicação com o servidor. Verifique a sua ligação ou o estado do servidor.'
        };
    }
};


// [NOVO V13.1] Função para aplicar configurações visuais (Nome, Logo, Cor)
window.applyVisualSettings = (settings) => {
    if (!settings) {
        console.warn("applyVisualSettings: Configurações não fornecidas.");
        return;
    }
    console.log("%c[applyVisualSettings] Invocada com:", "color: lightblue; font-weight: bold;", settings);

    const root = document.documentElement;

    // Mapeamento de configurações para variáveis CSS
    const styleMap = {
        'primary_color': '--primary-color',          // CORRIGIDO: Alinhado com o CSS em uso
        'background_color': '--background-dark',      // CORRIGIDO: Alinhado com o CSS em uso
        'sidebar_color': '--background-medium',      // CORRIGIDO: Alinhado com o CSS em uso
        'font_color': '--text-primary',            // CORRIGIDO: Alinhado com o CSS em uso
        'font_family': '--font-family',
        'font_size': '--font-size', // Adicionado 'px' abaixo
        'modal_background_color': '--modal-background-color',
        'modal_font_color': '--modal-font-color',
        'modal_border_color': '--modal-border-color',
        // [NOVO] Mapeamento para navegação e tipografia
        'nav_title_color': '--nav-title-color',
        'label_color': '--label-color',
        'placeholder_color': '--placeholder-color',
        'tab_link_color': '--tab-link-color',
        'tab_link_active_color': '--tab-link-active-color'
    };

    for (const key in styleMap) {
        if (settings[key] !== undefined && settings[key] !== null) {
            let value = settings[key];
            if (key === 'font_size') {
                value = `${value}px`;
            }
            console.log(` -> Aplicando ${styleMap[key]} = ${value}`);
            root.style.setProperty(styleMap[key], value);
        } else {
            console.log(` -> Chave '${key}' está nula ou indefinida. Pulando.`);
        }
    }

    // Lógica do logótipo
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
        if (settings.logo_url) {
            const API_ADMIN_URL = `http://${window.location.hostname}:3000`;
            const logoPath = settings.logo_url.startsWith('/') ? settings.logo_url : '/' + settings.logo_url;
            const newLogoSrc = `${API_ADMIN_URL}${logoPath}?t=${Date.now()}`;
            headerLogo.src = newLogoSrc;
            headerLogo.alt = settings.company_name || "Logótipo";
            headerLogo.style.display = 'block';
        } else {
            headerLogo.style.display = 'none';
            headerLogo.src = '#';
        }
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
    const reauthLgpdModal = document.getElementById('reauthLgpdModal');
    const reauthLgpdForm = document.getElementById('reauthLgpdForm');
    const cancelReauthBtn = document.getElementById('cancelReauthBtn');
    const reauthError = document.getElementById('reauthError');

    // [NOVO] Lógica de Notificações
    const notificationIcon = document.getElementById('notification-icon-wrapper');
    const notificationBadge = document.getElementById('notification-badge');
    let notificationInterval;
    let isDropdownVisible = false;

    const fetchUnreadCount = async () => {
        try {
            const response = await apiRequest('/api/notifications/unread-count');
            if (response.success) {
                const count = response.data.data.count;
                if (count > 0) {
                    notificationBadge.textContent = count;
                    notificationBadge.classList.remove('hidden');
                } else {
                    notificationBadge.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar contagem de notificações:', error);
        }
    };

    const startNotificationPolling = () => {
        if (notificationInterval) clearInterval(notificationInterval);
        fetchUnreadCount(); // Busca imediatamente ao iniciar
        notificationInterval = setInterval(fetchUnreadCount, 30000); // E depois a cada 30 segundos
    };

    const handleNotificationClick = async (notification) => {
        try {
            await apiRequest(`/api/notifications/${notification.id}/read`, 'PUT');
            // Remove a notificação da lista
            const notificationElement = document.querySelector(`.notification-item[data-id="${notification.id}"]`);
            if (notificationElement) {
                notificationElement.remove();
            }
            // Atualiza a contagem
            fetchUnreadCount();
            // Redireciona para a página de suporte
            const supportLink = document.querySelector('.sidebar-nav .nav-item[data-page="support"]');
            loadPage('support', supportLink, { ticketId: notification.related_ticket_id });
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
        }
    };

    const toggleNotificationDropdown = async () => {
        const existingDropdown = document.getElementById('notification-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            isDropdownVisible = false;
            return;
        }

        try {
            const response = await apiRequest('/api/notifications/unread');
            if (response.success) {
                const notifications = response.data.data;
                const dropdown = document.createElement('div');
                dropdown.id = 'notification-dropdown';
                dropdown.classList.add('notification-dropdown');

                if (notifications.length === 0) {
                    dropdown.innerHTML = '<p>Nenhuma notificação nova.</p>';
                } else {
                    notifications.forEach(notification => {
                        const item = document.createElement('div');
                        item.classList.add('notification-item');
                        item.dataset.id = notification.id;
                        item.innerHTML = `
                            <p>${notification.message}</p>
                            <span class="notification-time">${new Date(notification.created_at).toLocaleString()}</span>
                        `;
                        item.addEventListener('click', () => handleNotificationClick(notification));
                        dropdown.appendChild(item);
                    });
                    const markAllButton = document.createElement('button');
                    markAllButton.id = 'mark-all-as-read';
                    markAllButton.textContent = 'Marcar todas como lidas';
                    markAllButton.addEventListener('click', async () => {
                        try {
                            await apiRequest('/api/notifications/mark-as-read', 'PUT');
                            fetchUnreadCount();
                            toggleNotificationDropdown();
                        } catch (error) {
                            console.error('Erro ao marcar todas as notificações como lidas:', error);
                        }
                    });
                    dropdown.appendChild(markAllButton);
                }

                notificationIcon.appendChild(dropdown);
                isDropdownVisible = true;
            }
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
        }
    };

    notificationIcon?.addEventListener('click', toggleNotificationDropdown);


    // Mapeamento de inicializadores de página
    const pageInitializers = {
        'admin_home': window.initHomePage,
        'admin_hotspot': window.initHotspotPage,
        'admin_users': window.initUsersPage,
        'admin_templates': window.initTemplatesPage,
        'admin_banners': window.initBannersPage,
        'admin_campaigns': window.initCampaignsPage,
        'admin_routers': window.initRoutersPage,
        'admin_settings': window.initSettingsPage,
        'support': window.initSupportPage,
        'admin_raffles': window.initRafflesPage,
        'analytics_dashboard': window.initAnalyticsDashboard // [NOVO]
    };

    // --- [ATUALIZADO V13.1.3] IDs de verificação para o waitForElement ---
    const pageElementIds = {
        'admin_home': '#campaignsTotal',          // CORRIGIDO: ID atualizado após redesenho dos cards
        'admin_hotspot': '#hotspotFilterForm',      
        'admin_users': '#resetPasswordForm',        
        'admin_templates': '#templatesTable',       
        'admin_banners': '#bannersTable',           
        'admin_campaigns': '#campaignsTable',       
        'admin_routers': '#groupsTable',            
        'admin_settings': '#tab-perfil',
        'support': '#support-page-container',
        'admin_raffles': '#createRaffleForm',
        'analytics_dashboard': '#analytics-dashboard-wrapper' // [CORRIGIDO]
    };
    // --- FIM V13.1.3 ---


    // --- PAGE NAVIGATION (Atualizado V13.1) ---
    const loadPage = async (pageName, linkElement, params = {}) => {
        if (!isProfileLoaded) {
            console.warn(`loadPage (${pageName}) chamado antes do perfil (V13.1.3).`);
        }
        if (isProfileLoaded && window.currentUserProfile?.must_change_password) {
            console.warn(`Navegação ${pageName} bloqueada (V13.1.3): Senha.`);
            showForcePasswordChangeModal();
            return;
        }

        console.log(`loadPage (V13.1.3): Carregando ${pageName}...`);
        
        window.pageParams = params; // Store params globally

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
            const response = await fetch(`/pages/${pageName}.html?_=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Página ${pageName}.html não encontrada (${response.status})`);
            }
            if (mainContentArea) {
                const html = await response.text();
                mainContentArea.innerHTML = html;

                // [CORREÇÃO] Scripts inseridos via innerHTML não são executados.
                // Precisamos encontrá-los e recriá-los para que o navegador os execute.
                // Isso é crucial para carregar bibliotecas como Chart.js a partir do HTML dinâmico.
                const scripts = mainContentArea.querySelectorAll("script");
                scripts.forEach(oldScript => {
                    const newScript = document.createElement("script");
                    // Copia todos os atributos (como src, type, etc.)
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });
                    // Copia o conteúdo do script, se houver
                    newScript.textContent = oldScript.textContent;
                    // Substitui o script antigo pelo novo para acionar a execução
                    oldScript.parentNode.replaceChild(newScript, oldScript);
                    console.log(`[loadPage] Script "${newScript.src || 'inline'}" re-executado.`);
                });

            } else {
                console.error("'.content-area' (V13.1.3) não encontrado.");
                return;
            }

            const initFunction = pageInitializers[pageName];
            const elementToWaitFor = pageElementIds[pageName];

            if (typeof initFunction === 'function' && elementToWaitFor && mainContentArea) {
                // A função waitForElement garante que o HTML foi renderizado antes de executar o JS.
                // A chamada anterior estava incorreta.
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
    window.loadPageExternal = loadPage;

    // --- USER PROFILE & AUTH ---
    const fetchUserProfile = async () => {
        isProfileLoaded = false;
        window.currentUserProfile = null;
        try {
            console.log("fetchUserProfile (V13.6.1): Buscando perfil e permissões...");
            const data = await apiRequest('/api/admin/profile');
            console.log("API Response (full) for /api/admin/profile:", data);
            // console.log("API Response (data.data) for /api/admin/profile:", data.data); // Comentado para evitar redundância, o 'data' completo já inclui 'data.data'

            if (!data.data) {
                console.error("fetchUserProfile (V13.6.1): data.data está ausente.");
                throw new Error("Perfil inválido ou sem permissões (V13.6.1).");
            }
            if (!data.data.profile) {
                console.error("fetchUserProfile (V13.6.1): data.data.profile está ausente.");
                throw new Error("Perfil inválido ou sem permissões (V13.6.1).");
            }
            if (!data.data.profile.role) {
                console.error("fetchUserProfile (V13.6.1): data.data.profile.role está ausente.");
                throw new Error("Perfil inválido ou sem permissões (V13.6.1).");
            }
            if (!data.data.profile.permissions) {
                console.error("fetchUserProfile (V13.6.1): data.data.profile.permissions está ausente.");
                throw new Error("Perfil inválido ou sem permissões (V13.6.1).");
            }

            console.log(`fetchUserProfile (V13.6.1): Perfil recebido (Role: ${data.data.profile.role}).`);
            window.currentUserProfile = data.data.profile;
            isProfileLoaded = true;

            // Preenche os elementos no novo cabeçalho
            if (userNameElement) userNameElement.textContent = data.data.profile.email;
            if (userRoleElement) userRoleElement.textContent = data.data.profile.role.toUpperCase();

            // [NOVO] Lógica para o nome de boas-vindas
            const userFirstNameElement = document.getElementById('userFirstName');
            if (userFirstNameElement) {
                // Por enquanto, o campo 'nome_completo' não existe. Usaremos um fallback.
                if (data.data.profile.nome_completo) {
                    const firstName = data.data.profile.nome_completo.split(' ')[0];
                    userFirstNameElement.textContent = firstName;
                } else {
                    // Fallback se não houver nome completo, esconde a mensagem
                    const welcomeMessage = userFirstNameElement.closest('.welcome-message');
                    if(welcomeMessage) welcomeMessage.style.display = 'none';
                }
            }

            if (data.data.profile.must_change_password) {
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
    const applyMenuPermissions = (permissions, userRole) => {
        console.log(`applyMenuPermissions (V13.6.1): Aplicando permissões...`, permissions);

        if (!permissions) {
            console.error("applyMenuPermissions (V13.6.1): Objeto de permissões não fornecido!");
            return;
        }

        // [CORRIGIDO] Define a variável isMaster dentro do escopo da função
        const isMaster = (userRole === 'master');

        // Mapeia cada item de menu para a permissão de leitura necessária
        const menuPermissionMap = {
            'admin_home': 'dashboard.read',
            'admin_hotspot': 'hotspot.read',
            'admin_campaigns': 'campaigns.read',
            'admin_templates': 'templates.read',
            'admin_banners': 'banners.read',
            'admin_routers': 'routers.read',
            'admin_users': 'users.read',
            'analytics_dashboard': 'analytics.read', // [CORREÇÃO] Adiciona a permissão para o dashboard analítico
            'support': 'tickets.read' // [NOVO]
        };

        allNavItemsAndTitles.forEach(el => {
            if (!el.classList.contains('nav-item')) {
                el.style.removeProperty('display');
                return; // Se não for um nav-item, não aplicamos lógica de permissão diretamente
            }

            const page = el.getAttribute('data-page');
            const requiredPermission = menuPermissionMap[page];

            if (page === 'admin_settings') {
                const hasSettingsPermission = Object.keys(permissions).some(p => p.startsWith('settings.'));
                if (hasSettingsPermission) {
                    el.style.removeProperty('display');
                } else {
                    el.style.display = 'none';
                }
                return;
            }
            
            // Se não há uma permissão mapeada, o item é considerado público (como o Dashboard)
            if (!requiredPermission || permissions[requiredPermission] || isMaster) { // Garante que master veja tudo
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
        logoutButton.onclick = () => { // Usar onclick para garantir que não haja múltiplos listeners
            console.log("Logout (V13.1.3).");
            localStorage.removeItem('adminToken');
            window.currentUserProfile = null;
            isProfileLoaded = false;
            window.systemSettings = null;
            window.location.href = 'admin_login.html';
        };
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

    // [NOVO] Delegação de eventos para botões de atalho rápido
    if (mainContentArea) {
        mainContentArea.addEventListener('click', (e) => {
            const quickLink = e.target.closest('.quick-link-btn');
            if (quickLink) {
                e.preventDefault();
                const page = quickLink.getAttribute('data-page');
                const correspondingNavLink = document.querySelector(`.nav-item[data-page="${page}"]`);
                if (page && window.loadPageExternal && correspondingNavLink) {
                    window.loadPageExternal(page, correspondingNavLink);
                }
            }
        });
    }

    // --- Modal Troca Senha ---
            if (changePasswordForm) {
                changePasswordForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    console.log("Form troca senha submetido (V13.1.3).");
                    const btn = changePasswordForm.querySelector('button[type="submit"]');
                    const currIn = document.getElementById('currentTemporaryPassword');
                    const newIn = document.getElementById('newPassword');
                    
                    if(!currIn || !newIn) {
                         showNotification("Erro interno (campos não encontrados).", 'error');
                         if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
                         return;
                    }
    
                    const curr = currIn.value;
                    const nv = newIn.value;
    
                    if (nv.length < 6) {
                        showNotification('A nova senha deve ter pelo menos 6 caracteres.', 'error');
                        if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
                        return;
                    }
    
                    try {
                        const result = await apiRequest('/api/admin/profile/change-own-password', 'POST', {
                            currentPassword: curr,
                            newPassword: nv
                        });
                        
                        showNotification((result.message || "Senha alterada com sucesso!") + " A redirecionar para o login...", 'success');
                        
                        // Redireciona para o login após o sucesso
                        setTimeout(() => {
                            localStorage.removeItem('adminToken');
                            window.currentUserProfile = null; isProfileLoaded = false; window.systemSettings = null;
                            window.location.href = 'admin_login.html';
                        }, 4000);
    
                    } catch (error) {
                        showNotification(`Erro: ${error.message || 'Falha ao alterar a senha.'}`, 'error');
                        if(btn) { btn.disabled = false; btn.textContent = 'Alterar'; }
                    }
                });
            }
    
            if (reauthLgpdForm) {
                reauthLgpdForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('reauthEmail').value;
                    const password = document.getElementById('reauthPassword').value;
                    const submitButton = reauthLgpdForm.querySelector('button[type="submit"]');
    
                    submitButton.disabled = true;
                    submitButton.textContent = 'A verificar...';
                    if (reauthError) reauthError.style.display = 'none';
    
                    try {
                        const response = await apiRequest('/api/auth/re-authenticate', 'POST', { email, password });
    
                        if (response.success) {
                            window.location.href = 'pages/lgpd_management.html';
                        } else {
                            throw new Error(response.message || 'Falha na autenticação.');
                        }
                    } catch (error) {
                        if (reauthError) {
                            reauthError.textContent = error.message;
                            reauthError.style.display = 'block';
                        }
                    } finally {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Confirmar e Aceder';
                    }
                });
            }
    
            if (cancelReauthBtn) {
                cancelReauthBtn.addEventListener('click', () => {
                    if (reauthLgpdModal) reauthLgpdModal.classList.add('hidden');
                    if (reauthLgpdForm) reauthLgpdForm.reset();
                    if (reauthError) reauthError.style.display = 'none';
                });
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

    // 2. Busca e aplica as configurações gerais para TODOS os utilizadores
    try {
        console.log("Dashboard (V13.1.3): Buscando configurações gerais...");
        const settingsResponse = await apiRequest('/api/settings/general');
        // LOG ADICIONADO: Mostra a resposta completa da API
        console.log('%c[Dashboard Init] Resposta da API /api/settings/general:', 'color: orange;', settingsResponse);

        if (settingsResponse?.data) {
            window.systemSettings = settingsResponse.data;
            applyVisualSettings(window.systemSettings);
            console.log("%c[Dashboard Init] Configurações visuais aplicadas com sucesso.", "color: green;");
        } else {
            console.warn("Dashboard (V13.1.3): Configurações gerais não retornadas pela API.");
            window.systemSettings = {};
        }
    } catch (settingsError) {
        console.error("Dashboard (V13.1.3): Erro ao buscar/aplicar configurações gerais:", settingsError);
        window.systemSettings = {};
    }

    // 3. [LÓGICA V13.6.1] Aplica permissões ao menu
    console.log("Dashboard (V13.6.1): Permissões do usuário:", window.currentUserProfile.permissions);
    applyMenuPermissions(window.currentUserProfile.permissions, window.currentUserProfile.role);

    // [NOVO] Inicia a verificação de notificações
    startNotificationPolling();


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