// Ficheiro: frontend/js/support_request.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('supportRequestForm');
    const formView = document.getElementById('formView');
    const successView = document.getElementById('successView');
    const ticketNumberDisplay = document.getElementById('ticketNumberDisplay');

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

    // --- Lógica do Formulário ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            
            submitButton.disabled = true;
            submitButton.textContent = 'A enviar...';

            // Coleta dados do formulário
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                sector: document.getElementById('sector').value,
                location: document.getElementById('location').value,
                title: document.getElementById('title').value,
                message: document.getElementById('message').value
            };

            try {
                // [REFEITO] Usa a função centralizada 'apiRequest'
                const data = await apiRequest('/api/public/tickets', 'POST', formData);
                
                // Sucesso
                ticketNumberDisplay.textContent = `#${data.data.ticketNumber}`;
                formView.style.display = 'none';
                successView.style.display = 'block';
            } catch (error) {
                showNotification(error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }
});