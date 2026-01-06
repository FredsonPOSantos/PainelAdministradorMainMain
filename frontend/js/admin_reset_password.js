document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const API_BASE_URL = `http://${window.location.hostname}:3000`;

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
            const response = await fetch(`${API_BASE_URL}/api/settings/general`);
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
                const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: tokenValue, newPassword: password })
                });

                const data = await response.json();

                if (response.ok) {
                    showNotification('Senha alterada com sucesso! Redirecionando...', 'success');
                    setTimeout(() => {
                        window.location.href = 'admin_login.html';
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Erro ao redefinir senha.');
                }
            } catch (error) {
                showNotification(error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Alterar Senha';
            }
        });
    }
});