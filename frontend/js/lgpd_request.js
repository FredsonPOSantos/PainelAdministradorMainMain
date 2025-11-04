document.addEventListener('DOMContentLoaded', () => {
    const lgpdRequestForm = document.getElementById('lgpdRequestForm');
    const requestView = document.getElementById('requestView');
    const resultView = document.getElementById('resultView');
    const resultMessage = document.getElementById('resultMessage');

    if (lgpdRequestForm) {
        lgpdRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('userEmail').value;
            const submitButton = lgpdRequestForm.querySelector('button[type="submit"]');

            submitButton.disabled = true;
            submitButton.textContent = 'A enviar...';

            try {
                const response = await fetch(`http://${window.location.hostname}:3000/api/lgpd/request-exclusion`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                const result = await response.json();

                if (response.ok) {
                    requestView.classList.add('hidden');
                    resultView.classList.remove('hidden');
                    resultMessage.textContent = result.message || 'Pedido de exclusão enviado com sucesso.';
                    resultMessage.style.color = 'var(--success-text)';
                } else {
                    throw new Error(result.message || 'Ocorreu um erro.');
                }

            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Pedido';
            }
        });
    }

    // Função showNotification (pode ser movida para um script global no futuro)
    const showNotification = (message, type = 'info') => {
        const container = document.getElementById('notification-container') || document.body;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        container.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 5000);
    };
});
