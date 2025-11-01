// Ficheiro: frontend/js/admin_reset_password.js
// Lógica para a Fase 2.2 - Página de definição de nova senha

document.addEventListener('DOMContentLoaded', () => {

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resetMessage = document.getElementById('resetMessage');
    const tokenInput = document.getElementById('resetToken');
    const newPasswordInput = document.getElementById('resetNewPassword');
    const confirmPasswordInput = document.getElementById('resetConfirmPassword');
    
    // API URL (deve ser o mesmo IP/domínio do frontend, mas na porta 3000)
    const API_BASE_URL = `http://${window.location.hostname}:3000`;

    // --- Tenta extrair o token da URL ---
    // (Ex: admin_reset_password.html?token=seu_token_aqui)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
        tokenInput.value = tokenFromUrl;
    }

    // --- Lógica do Formulário de Reset ---
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            resetMessage.textContent = '';
            resetMessage.className = 'form-message';
            const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A processar...';

            const token = tokenInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validação
            if (newPassword !== confirmPassword) {
                resetMessage.textContent = 'As novas senhas não coincidem.';
                resetMessage.classList.add('error');
                submitButton.disabled = false;
                submitButton.textContent = 'Definir Nova Senha';
                return;
            }

            if (!token) {
                 resetMessage.textContent = 'O token de recuperação é obrigatório.';
                resetMessage.classList.add('error');
                submitButton.disabled = false;
                submitButton.textContent = 'Definir Nova Senha';
                return;
            }

            try {
                // Chama a nova rota de backend
                const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, newPassword })
                });
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro desconhecido');
                }

                // Sucesso!
                resetMessage.textContent = data.message + " Você será redirecionado para o login.";
                resetMessage.classList.add('success');
                resetPasswordForm.reset();

                // Redireciona para o login após 3 segundos
                setTimeout(() => {
                    window.location.href = 'admin_login.html';
                }, 3000);

            } catch (error) {
                resetMessage.textContent = `Erro: ${error.message}`;
                resetMessage.classList.add('error');
            } finally {
                // Só re-habilita o botão se não tiver tido sucesso
                if (!resetMessage.classList.contains('success')) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Definir Nova Senha';
                }
            }
        });
    }
});
