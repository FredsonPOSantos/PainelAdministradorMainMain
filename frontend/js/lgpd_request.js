// Ficheiro: frontend/js/lgpd_request.js

document.addEventListener('DOMContentLoaded', () => {
    const lgpdRequestForm = document.getElementById('lgpdRequestForm');
    const requestView = document.getElementById('requestView');
    const resultView = document.getElementById('resultView');
    const resultMessage = document.getElementById('resultMessage');

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
            // [REFEITO] Usa a função centralizada 'apiRequest' para consistência.
            const settings = await apiRequest('/api/settings/general', 'GET');
            applyVisualSettings(settings);
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    };

    fetchSettings();

    if (lgpdRequestForm) {
        lgpdRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitButton = lgpdRequestForm.querySelector('button[type="submit"]');
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('userEmail').value;
            const termsCheckbox = document.getElementById('termsCheckbox');

            if (!termsCheckbox.checked) {
                showNotification('Deve declarar que está ciente dos termos para continuar.', 'warning');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'A enviar...';

            try {
                // [REFEITO] Usa a função centralizada 'apiRequest'
                const data = await apiRequest('/api/lgpd/request-exclusion', 'POST', { fullName, email });

                // Sucesso
                if (requestView) requestView.style.display = 'none';
                if (resultView) resultView.style.display = 'block';
                if (resultMessage) resultMessage.textContent = data.message || 'Pedido enviado com sucesso.';

            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Pedido';
            }
        });
    }
});