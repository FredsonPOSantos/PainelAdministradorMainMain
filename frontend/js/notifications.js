/**
 * Ficheiro: frontend/js/notifications.js
 * Descrição: Sistema de notificações customizado para substituir os alerts padrão.
 * Autor: Gemini
 */

function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('Elemento #notification-container não encontrado.');
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    let icon = '';
    if (type === 'success') {
        icon = '<span class="notification-icon">&#10003;</span>'; // Checkmark
    } else if (type === 'error') {
        icon = '<span class="notification-icon">&#10005;</span>'; // X
    } else {
        icon = '<span class="notification-icon">&#8505;</span>'; // Info i
    }

    notification.innerHTML = `${icon} <p>${message}</p><span class="notification-close">&times;</span>`;

    container.appendChild(notification);

    // Força o repaint para a animação de entrada funcionar
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    const closeButton = notification.querySelector('.notification-close');
    closeButton.addEventListener('click', () => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    });

    // Remove a notificação após a duração
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.remove('show');
            // Espera a animação de saída terminar para remover o elemento
            notification.addEventListener('transitionend', () => {
                notification.remove();
            });
        }, duration);
    }
}
