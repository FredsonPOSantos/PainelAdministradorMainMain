// Ficheiro: frontend/js/lgpd_request.js

document.addEventListener('DOMContentLoaded', () => {
    const lgpdRequestForm = document.getElementById('lgpdRequestForm');
    const requestView = document.getElementById('requestView');
    const resultView = document.getElementById('resultView');
    const resultMessage = document.getElementById('resultMessage');

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
                const response = await fetch(`http://${window.location.hostname}:3000/api/lgpd/request-exclusion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Ocorreu um erro ao enviar o seu pedido.');
                }

                // Sucesso
                if (requestView) requestView.style.display = 'none';
                if (resultView) resultView.style.display = 'block';
                if (resultMessage) resultMessage.textContent = data.message;

            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Pedido';
            }
        });
    }
});