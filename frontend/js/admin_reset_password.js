document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    // --- Carregar e Aplicar Configurações Visuais ---
    const applyVisualSettings = (settings) => {
        if (!settings) return;

        const loginLogo = document.getElementById('loginLogo');
        if (loginLogo && settings.login_logo_url) {
            loginLogo.src = `http://${window.location.hostname}:3000${settings.login_logo_url}`;
            loginLogo.style.display = 'block';
        }

        const showcasePanel = document.getElementById('loginShowcase');
        if (showcasePanel && settings.background_image_url) {
            showcasePanel.style.backgroundImage = `url('http://${window.location.hostname}:3000${settings.background_image_url}')`;
        } else if (settings.login_background_color && showcasePanel) {
            showcasePanel.style.backgroundColor = settings.login_background_color;
        }

        if (settings.login_form_background_color) {
            document.documentElement.style.setProperty('--background-medium', settings.login_form_background_color);
        }
        if (settings.login_font_color) {
            document.documentElement.style.setProperty('--text-primary', settings.login_font_color);
        }
        if (settings.login_button_color) {
            document.documentElement.style.setProperty('--primary-color', settings.login_button_color);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch(`http://${window.location.hostname}:3000/api/settings/general`);
            if (response.ok) {
                const settings = await response.json();
                applyVisualSettings(settings);
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    };

    fetchSettings();

    // --- Capturar Token da URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        document.getElementById('token').value = token;
    } else {
        showNotification('Token de recuperação inválido ou ausente.', 'error');
    }

    // --- Lógica do Formulário ---
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const tokenValue = document.getElementById('token').value;

            if (password !== confirmPassword) {
                showNotification('As senhas não coincidem.', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'A alterar...';

            try {
                // [REFEITO] Usa a função centralizada 'apiRequest'
                await apiRequest('/api/auth/reset-password', 'POST', { token: tokenValue, newPassword: password });
                
                showNotification('Senha alterada com sucesso! Redirecionando...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin_login.html';
                }, 2000);
            } catch (error) {
                showNotification(error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Alterar Senha';
            }
        });
    }
});