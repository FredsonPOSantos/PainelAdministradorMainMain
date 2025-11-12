
/**
 * Exibe um modal de confirmação customizável.
 * @param {string} message - A mensagem a ser exibida no modal.
 * @param {string} [title='Confirmar Ação'] - O título do modal.
 * @param {Array<Object>} [buttons] - Um array de objetos para botões customizados. 
 *   Ex: [{ text: 'Sim', value: 'yes', class: 'btn-primary' }, { text: 'Não', value: 'no', class: 'btn-secondary' }]
 *   Se não fornecido, usa os botões padrão 'Confirmar' e 'Cancelar'.
 * @returns {Promise<string|boolean>} - A promessa resolve com o `value` do botão clicado, ou `false` se fechado de outra forma.
 */
function showConfirmationModal(message, title = 'Confirmar Ação', buttons = null) {
    return new Promise((resolve) => {
        // Remove qualquer modal existente para evitar duplicados
        const existingModal = document.getElementById('confirmationModal');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'confirmationModal';
        modalOverlay.className = 'confirmation-modal-overlay';

        // Gera os botões
        let buttonsHtml = '';
        if (buttons && Array.isArray(buttons)) {
            buttonsHtml = buttons.map(btn => 
                `<button class="confirmation-modal-btn ${btn.class || ''}" data-value="${btn.value}">${btn.text}</button>`
            ).join('');
        } else {
            // Botões padrão
            buttonsHtml = `
                <button class="confirmation-modal-btn" data-value="false">Cancelar</button>
                <button class="confirmation-modal-btn" data-value="true">Confirmar</button>
            `;
        }

        modalOverlay.innerHTML = `
            <div class="confirmation-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirmation-modal-buttons">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modalOverlay);

        const closeModal = (result) => {
            modalOverlay.classList.remove('visible');
            // Espera a animação de fade-out terminar para remover o elemento
            modalOverlay.addEventListener('transitionend', () => {
                modalOverlay.remove();
                // Converte 'true'/'false' string para booleano, se for o caso
                if (result === 'true') resolve(true);
                else if (result === 'false') resolve(false);
                else resolve(result);
            });
        };

        modalOverlay.querySelectorAll('.confirmation-modal-btn').forEach(btn => {
            btn.addEventListener('click', () => closeModal(btn.dataset.value));
        });

        // Adiciona a classe 'visible' após um pequeno atraso para permitir a animação de fade-in
        setTimeout(() => {
            modalOverlay.classList.add('visible');
        }, 10);

    });
}
