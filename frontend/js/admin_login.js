// Ficheiro: frontend/js/admin_login.js
// Contém a lógica para o login (original) e recuperação de senha (Fase 2.2)

document.addEventListener('DOMContentLoaded', () => {

    // --- Seletores de Elementos ---
    const loginView = document.getElementById('loginView');
    const forgotView = document.getElementById('forgotView');
    
    const adminLoginForm = document.getElementById('adminLoginForm');
    const loginMessage = document.getElementById('loginMessage');
    
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotMessage = document.getElementById('forgotMessage');

    const showForgotViewBtn = document.getElementById('showForgotViewBtn');
    const showLoginViewBtn = document.getElementById('showLoginViewBtn');
    
    // API URL (deve ser o mesmo IP/domínio do frontend, mas na porta 3000)
    const API_BASE_URL = `http://${window.location.hostname}:3000`;

    // --- Lógica para alternar entre os formulários ---
    showForgotViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginView.classList.add('hidden');
        forgotView.classList.remove('hidden');
    });

    showLoginViewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        forgotView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // --- Lógica de Login (Original) ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginMessage.textContent = '';
            loginMessage.className = 'form-message';
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
                loginMessage.textContent = `Erro: ${error.message}`;
                loginMessage.classList.add('error');
                submitButton.disabled = false;
                submitButton.textContent = 'Entrar';
            }
        });
    }
    
    // --- Lógica de Recuperação de Senha (Fase 2.2) ---
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            forgotMessage.textContent = '';
            forgotMessage.className = 'form-message';
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A processar...';

            const email = e.target.forgotEmail.value;

            try {
                // Chama a nova rota de backend
                const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro desconhecido');
                }

                // Sucesso!
                forgotMessage.textContent = data.message;
                // [NOTA DE SIMULAÇÃO] Em produção, esta mensagem seria "E-mail enviado!".
                // Estamos a mostrar a mensagem do backend (que inclui o token) para testes.
                forgotMessage.classList.add('success');
                forgotPasswordForm.reset();

            } catch (error) {
                forgotMessage.textContent = `Erro: ${error.message}`;
                forgotMessage.classList.add('error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Solicitar Recuperação';
            }
        });
    }
});

