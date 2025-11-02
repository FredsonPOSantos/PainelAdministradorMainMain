document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const resetMessage = document.getElementById('resetMessage');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Insere o token no campo hidden do formulário
    document.getElementById('token').value = token;

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            resetMessage.textContent = 'As senhas não coincidem.';
            resetMessage.className = 'form-message error';
            return;
        }

        if (!token) {
            resetMessage.textContent = 'Token de redefinição inválido ou ausente.';
            resetMessage.className = 'form-message error';
            return;
        }

        try {
            const response = await fetch(`http://${window.location.hostname}:3000/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, newPassword }),
            });

            const result = await response.json();

            if (response.ok) {
                resetMessage.textContent = result.message;
                resetMessage.className = 'form-message success';
                // Opcional: redirecionar para a página de login após sucesso
                setTimeout(() => {
                    window.location.href = 'admin_login.html';
                }, 3000);
            } else {
                resetMessage.textContent = result.message || 'Erro ao redefinir a senha.';
                resetMessage.className = 'form-message error';
            }
        } catch (error) {
            console.error('Erro na requisição de redefinição de senha:', error);
            resetMessage.textContent = 'Ocorreu um erro. Tente novamente.';
            resetMessage.className = 'form-message error';
        }
    });
});