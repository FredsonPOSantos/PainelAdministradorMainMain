// Ficheiro: frontend/js/admin_login.js
// Contém a lógica para o login

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
    const adminLoginForm = document.getElementById('adminLoginForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    // API URL (deve ser o mesmo IP/domínio do frontend, mas na porta 3000)
    const API_BASE_URL = `http://${window.location.hostname}:3000`;

    // --- Lógica de Login ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = adminLoginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A processar...';

            const email = e.target.email.value;
            const password = e.target.senha.value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro desconhecido');
                }

                // Sucesso! Guarda o token e redireciona
                localStorage.setItem('adminToken', data.token);
                window.location.href = 'admin_dashboard.html';

            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Entrar';
            }
        });
    }

    // --- Lógica do Link de Recuperação de Senha ---
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Redireciona para a página de solicitação de recuperação
            window.location.href = 'admin_forgot_password.html'; 
        });
    }

    // --- Carregar e Aplicar Configurações Visuais ---
    const applyLoginVisualSettings = (settings) => {
        if (!settings) return;

        const loginLogo = document.getElementById('loginLogo');
        if (loginLogo && settings.login_logo_url) {
            loginLogo.src = `http://${window.location.hostname}:3000${settings.login_logo_url}`;
            loginLogo.style.display = 'block';
        }

        const companyNameElement = document.getElementById('companyNameLogin');
        if (companyNameElement && settings.company_name) {
            companyNameElement.textContent = settings.company_name;
        }

        // Prioriza a imagem de fundo sobre a cor de fundo
        if (settings.background_image_url) {
            document.body.style.backgroundImage = `url('http://${window.location.hostname}:3000${settings.background_image_url}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
        } else if (settings.login_background_color) {
            document.documentElement.style.setProperty('--background-dark', settings.login_background_color);
        }

        if (settings.login_form_background_color) {
            document.documentElement.style.setProperty('--background-medium', settings.login_form_background_color);
        }
        if (settings.login_font_color) {
            document.documentElement.style.setProperty('--text-primary', settings.login_font_color);
        }
        if (settings.login_button_color) {
            document.documentElement.style.setProperty('--primary-color', settings.login_button_color);
        } else if (settings.primary_color) {
            document.documentElement.style.setProperty('--primary-color', settings.primary_color);
        }
    };

    const fetchAndApplySettings = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/settings/general`);
            if (response.ok) {
                const settings = await response.json();
                applyLoginVisualSettings(settings);
            }
        } catch (error) {
            console.error('Erro ao buscar configurações de aparência do login:', error);
        }
    };

    fetchAndApplySettings();
});

