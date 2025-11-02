document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Insere o token no campo hidden do formulário
    document.getElementById('token').value = token;

    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showNotification('As senhas não coincidem.', 'error');
            return;
        }

        if (!token) {
            showNotification('Token de redefinição inválido ou ausente.', 'error');
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
                showNotification(result.message, 'success');
                // Opcional: redirecionar para a página de login após sucesso
                setTimeout(() => {
                    window.location.href = 'admin_login.html';
                }, 3000);
            } else {
                showNotification(result.message || 'Erro ao redefinir a senha.', 'error');
            }
        } catch (error) {
            console.error('Erro na requisição de redefinição de senha:', error);
            showNotification('Ocorreu um erro. Tente novamente.', 'error');
        }
    });
});