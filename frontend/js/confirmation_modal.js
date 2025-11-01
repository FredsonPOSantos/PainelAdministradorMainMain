/**
 * Ficheiro: frontend/js/confirmation_modal.js
 * Descrição: Sistema de modal de confirmação customizado para substituir os confirms padrão.
 * Autor: Gemini
 */

function showConfirmationModal(message, title = 'Confirmar Ação') {
    return new Promise((resolve) => {
        // Remove qualquer modal existente para evitar duplicados
        const existingModal = document.getElementById('confirmationModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Cria a estrutura do modal
        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'confirmationModal';
        modalOverlay.className = 'confirmation-modal-overlay';

        modalOverlay.innerHTML = `
            <div class="confirmation-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirmation-modal-buttons">
                    <button id="cancel-btn-modal" class="confirmation-modal-btn">Cancelar</button>
                    <button id="confirm-btn-modal" class="confirmation-modal-btn">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const confirmBtn = document.getElementById('confirm-btn-modal');
        const cancelBtn = document.getElementById('cancel-btn-modal');

        const closeModal = (result) => {
            modalOverlay.classList.remove('visible');
            // Espera a animação de fade-out terminar para remover o elemento
            modalOverlay.addEventListener('transitionend', () => {
                modalOverlay.remove();
                resolve(result);
            });
        };

        confirmBtn.addEventListener('click', () => closeModal(true));
        cancelBtn.addEventListener('click', () => closeModal(false));

        // Adiciona a classe 'visible' após um pequeno atraso para permitir a animação de fade-in
        setTimeout(() => {
            modalOverlay.classList.add('visible');
        }, 10);
    });
}
