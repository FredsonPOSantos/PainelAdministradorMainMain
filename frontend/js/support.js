// Ficheiro: frontend/js/support.js

if (window.initSupportPage) {
    console.warn("Tentativa de carregar support.js múltiplas vezes.");
} else {
    window.initSupportPage = () => {
        console.log("A inicializar a página de Suporte...");

        const ticketListDiv = document.getElementById('ticket-list');
        const ticketDetailPanel = document.getElementById('ticket-detail-panel');
        const newTicketBtn = document.getElementById('newTicketBtn');
        const newTicketModal = document.getElementById('newTicketModal');
        const newTicketForm = document.getElementById('newTicketForm');
        const cancelNewTicketBtn = document.getElementById('cancelNewTicketBtn');

        let allUsers = []; // Cache para a lista de utilizadores

        // Carrega todos os tickets e os exibe na lista
        const loadTickets = async () => {
            if (!ticketListDiv) return;
            ticketListDiv.innerHTML = '<p>A carregar tickets...</p>';
            try {
                const response = await apiRequest('/api/tickets');
                if (!response.success) throw new Error(response.message);

                const tickets = response.data.data;
                ticketListDiv.innerHTML = '';

                if (tickets.length === 0) {
                    ticketListDiv.innerHTML = '<p>Nenhum ticket encontrado.</p>';
                    return;
                }

                tickets.forEach(ticket => {
                    const ticketElement = document.createElement('div');
                    ticketElement.className = 'ticket-item';
                    ticketElement.dataset.ticketId = ticket.id;
                    ticketElement.innerHTML = `
                        <div class="ticket-item-header">
                            <span class="ticket-number">#${ticket.ticket_number}</span>
                            <span class="ticket-status status-${ticket.status}">${ticket.status}</span>
                        </div>
                        <div class="ticket-item-title">${ticket.title}</div>
                        <div class="ticket-item-meta">
                            <span>Criado por: ${ticket.created_by_email}</span>
                            <span>Atualizado: ${new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
                        </div>
                    `;
                    ticketElement.addEventListener('click', () => loadTicketDetails(ticket.id));
                    ticketListDiv.appendChild(ticketElement);
                });
            } catch (error) {
                ticketListDiv.innerHTML = '<p style="color: red;">Erro ao carregar tickets.</p>';
                console.error(error);
            }
        };

        // Carrega os detalhes de um ticket específico
        const loadTicketDetails = async (ticketId) => {
            if (!ticketDetailPanel) return;
            ticketDetailPanel.innerHTML = '<div class="ticket-placeholder"><p>A carregar detalhes...</p></div>';

            // Destaca o ticket selecionado na lista
            document.querySelectorAll('.ticket-item').forEach(el => el.classList.remove('active'));
            document.querySelector(`.ticket-item[data-ticket-id="${ticketId}"]`)?.classList.add('active');

            try {
                const response = await apiRequest(`/api/tickets/${ticketId}`);
                if (!response.success) throw new Error(response.message);

                const ticket = response.data.data;
                renderTicketDetails(ticket);

            } catch (error) {
                ticketDetailPanel.innerHTML = '<div class="ticket-placeholder"><p style="color: red;">Erro ao carregar detalhes do ticket.</p></div>';
                console.error(error);
            }
        };

        // Renderiza o painel de detalhes do ticket
        const renderTicketDetails = (ticket) => {
            let messagesHtml = '';
            ticket.messages.forEach(msg => {
                const isCurrentUser = msg.user_email === window.currentUserProfile.email;
                messagesHtml += `
                    <div class="message-item ${isCurrentUser ? 'sent' : 'received'}">
                        <div class="message-content">${msg.message}</div>
                        <div class="message-meta">
                            <span>${msg.user_email}</span> em 
                            <span>${new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                `;
            });

            // Lógica de ações (atribuir, fechar, etc.)
            let actionsHtml = '<div class="ticket-actions">';
            if (['master', 'gestao'].includes(window.currentUserProfile.role)) {
                actionsHtml += `
                    <div class="input-group">
                        <label for="assignUserSelect">Atribuir a:</label>
                        <select id="assignUserSelect">
                            <option value="">Ninguém</option>
                            ${allUsers.map(u => `<option value="${u.id}" ${ticket.assigned_to_email === u.email ? 'selected' : ''}>${u.email}</option>`).join('')}
                        </select>
                        <button id="assignTicketBtn" class="btn-secondary btn-sm">Atribuir</button>
                    </div>
                `;
            }
            if (ticket.status === 'open') {
                actionsHtml += `<button id="progressTicketBtn" class="btn-secondary">Marcar como Em Andamento</button>`;
            }
            if (ticket.status !== 'closed') {
                actionsHtml += `<button id="closeTicketBtn" class="btn-danger">Fechar Ticket</button>`;
            } else {
                 actionsHtml += `<button id="reopenTicketBtn" class="btn-secondary">Reabrir Ticket</button>`;
            }
            actionsHtml += '</div>';

            ticketDetailPanel.innerHTML = `
                <div class="panel-header">
                    <h3>${ticket.title}</h3>
                    <span class="ticket-status status-${ticket.status}">${ticket.status}</span>
                </div>
                <div class="ticket-details-meta">
                    <span>Ticket: #${ticket.ticket_number}</span>
                    <span>Criado por: ${ticket.created_by_email}</span>
                    <span>Atribuído a: ${ticket.assigned_to_email || 'Ninguém'}</span>
                </div>
                <div class="ticket-conversation-panel">
                    <div id="message-list" class="message-list">${messagesHtml}</div>
                    ${ticket.status !== 'closed' ? `
                    <form id="newMessageForm" class="new-message-form">
                        <textarea id="newMessageText" placeholder="Escreva a sua resposta..." required></textarea>
                        <button type="submit">Enviar Mensagem</button>
                    </form>
                    ` : ''}
                </div>
                ${actionsHtml}
            `;

            // Adiciona event listeners para os novos elementos
            addDetailEventListeners(ticket.id);
        };

        // Adiciona os listeners para os botões e formulários no painel de detalhes
        const addDetailEventListeners = (ticketId) => {
            document.getElementById('newMessageForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const messageText = document.getElementById('newMessageText').value;
                if (!messageText) return;

                await apiRequest(`/api/tickets/${ticketId}/messages`, 'POST', { message: messageText });
                loadTicketDetails(ticketId); // Recarrega os detalhes
            });

            document.getElementById('assignTicketBtn')?.addEventListener('click', async () => {
                const assignee_id = document.getElementById('assignUserSelect').value;
                await apiRequest(`/api/tickets/${ticketId}/assign`, 'PUT', { assignee_id: assignee_id || null });
                loadTicketDetails(ticketId);
            });

            document.getElementById('closeTicketBtn')?.addEventListener('click', async () => {
                await apiRequest(`/api/tickets/${ticketId}/status`, 'PUT', { status: 'closed' });
                loadTickets(); // Recarrega a lista principal
                loadTicketDetails(ticketId);
            });

            document.getElementById('progressTicketBtn')?.addEventListener('click', async () => {
                await apiRequest(`/api/tickets/${ticketId}/status`, 'PUT', { status: 'in_progress' });
                loadTicketDetails(ticketId);
            });
        };

        // Abre e fecha o modal de novo ticket
        newTicketBtn?.addEventListener('click', () => newTicketModal?.classList.remove('hidden'));
        cancelNewTicketBtn?.addEventListener('click', () => newTicketModal?.classList.add('hidden'));

        // Lida com a submissão do novo ticket
        newTicketForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('ticketTitle').value;
            const message = document.getElementById('ticketMessage').value;

            try {
                const response = await apiRequest('/api/tickets', 'POST', { title, message });
                if (!response.success) throw new Error(response.message);
                
                newTicketModal.classList.add('hidden');
                newTicketForm.reset();
                showNotification('Ticket criado com sucesso!', 'success');
                loadTickets(); // Recarrega a lista de tickets
                loadTicketDetails(response.data.data.ticketId); // Carrega o novo ticket
            } catch (error) {
                showNotification(`Erro ao criar ticket: ${error.message}`, 'error');
            }
        });

        // Função inicial que carrega os dados necessários
        const initialize = async () => {
            // Carrega a lista de utilizadores para o dropdown de atribuição
            if (['master', 'gestao'].includes(window.currentUserProfile.role)) {
                try {
                    const usersResponse = await apiRequest('/api/admin/users');
                    if(usersResponse.success) allUsers = usersResponse.data;
                } catch (e) {
                    console.error("Erro ao carregar lista de utilizadores para atribuição", e);
                }
            }
            // Carrega a lista inicial de tickets
            await loadTickets();

            // [NOVO] Verifica se um ticketId foi passado via parâmetros da página
            if (window.pageParams && window.pageParams.ticketId) {
                console.log(`A carregar ticket ${window.pageParams.ticketId} a partir da notificação...`);
                loadTicketDetails(window.pageParams.ticketId);
                // Limpa os parâmetros para não recarregar na próxima navegação
                window.pageParams = {}; 
            }
        };

        initialize();
    };
}