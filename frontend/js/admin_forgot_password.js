document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotMessage = document.getElementById('forgotMessage');
    const API_BASE_URL = `http://${window.location.hostname}:3000`;

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            forgotMessage.textContent = '';
            forgotMessage.className = 'form-message';
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A processar...';

            const email = e.target.email.value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erro desconhecido');
                }

                forgotMessage.textContent = data.message;
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