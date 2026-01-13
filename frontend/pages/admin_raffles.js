// Ficheiro: frontend/js/admin_raffles.js

if (window.initRafflesPage) {
    console.warn("Tentativa de carregar admin_raffles.js múltiplas vezes.");
} else {
    window.initRafflesPage = () => {
        console.log("A inicializar a página de gestão de Sorteios...");

        // --- ELEMENTOS DO DOM ---
        const createRaffleForm = document.getElementById('createRaffleForm');
        const rafflesTableBody = document.querySelector('#rafflesTable tbody');
        const detailsModal = document.getElementById('raffleDetailsModal');
        const detailsContent = document.getElementById('raffleDetailsContent');
        const detailsCloseBtn = detailsModal.querySelector('.modal-close-btn');

        // --- [NOVO] Selectors para o modal de progresso ---
        const progressModal = document.getElementById('raffleProgressModal');
        const progressModalTitle = document.getElementById('progressModalTitle');
        const progressStatusText = document.getElementById('progressStatusText');
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressModalActions = document.getElementById('progressModalActions');
        const closeProgressModalBtn = document.getElementById('closeProgressModalBtn');

        // --- [NOVO] Conexão Socket.io ---
        const socket = io(`http://${window.location.hostname}:3000`, {
            transports: ['websocket'], // Força websocket para maior fiabilidade
            reconnectionAttempts: 5
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor de progresso via Socket.io. ID:', socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error("Falha na conexão com o Socket.io:", err.message);
        });

        // --- [NOVO] Função de limpeza para desconectar o socket ao sair da página ---
        window.cleanupRafflesPage = () => {
            if (socket) {
                console.log('A desconectar socket de sorteios...');
                socket.disconnect();
            }
        };

        // --- [NOVO] Listener para eventos de progresso ---
        socket.on('raffle_progress', (data) => {
            console.log('Progresso recebido:', data);
            if (progressModal.classList.contains('hidden')) return;

            progressStatusText.textContent = data.status;
            progressBar.style.width = `${data.progress}%`;
            progressPercentage.textContent = `${Math.round(data.progress)}%`;

            if (data.progress >= 100) {
                progressModalTitle.textContent = data.error ? 'Erro no Processo' : 'Processo Concluído!';
                if (data.error) {
                    progressStatusText.textContent = data.error;
                    progressBar.style.backgroundColor = '#ef4444'; // Vermelho para erro
                }
                progressModalActions.style.display = 'flex';
            }
        });

        // --- FUNÇÕES DE LÓGICA ---

        const loadRaffles = async () => {
            rafflesTableBody.innerHTML = '<tr><td colspan="5">A carregar...</td></tr>';
            try {
                const response = await apiRequest('/api/raffles');
                const raffles = response.data || [];
                rafflesTableBody.innerHTML = '';
                if (raffles.length === 0) {
                    rafflesTableBody.innerHTML = '<tr><td colspan="5">Nenhum sorteio encontrado.</td></tr>';
                    return;
                }
                raffles.forEach(raffle => {
                    const row = document.createElement('tr');
                    const winnerName = raffle.winner_name || (raffle.drawn_at ? 'Sorteado, sem nome' : 'Pendente');
                    const drawBtn = !raffle.drawn_at ? `<button class="btn-primary btn-sm btn-draw" data-id="${raffle.id}">Sortear</button>` : '';

                    row.innerHTML = `
                        <td>${raffle.id}</td>
                        <td>${raffle.title}</td>
                        <td>${new Date(raffle.created_at).toLocaleString()}</td>
                        <td>${winnerName}</td>
                        <td class="action-buttons">
                            <button class="btn-secondary btn-sm btn-details" data-id="${raffle.id}">Detalhes</button>
                            ${drawBtn}
                            <button class="btn-delete btn-sm" data-id="${raffle.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    rafflesTableBody.appendChild(row);
                });
            } catch (error) {
                rafflesTableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar sorteios.</td></tr>`;
            }
        };

        const handleCreateRaffle = async (e) => {
            e.preventDefault();
            const submitButton = createRaffleForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            // Abre e reseta o modal de progresso
            progressModalTitle.textContent = 'A Criar Sorteio...';
            progressStatusText.textContent = 'A enviar pedido...';
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = 'var(--primary-color)';
            progressPercentage.textContent = '0%';
            progressModalActions.style.display = 'none';
            progressModal.classList.remove('hidden');

            const raffleData = {
                title: document.getElementById('raffleTitle').value,
                observation: document.getElementById('raffleObservation').value,
                filters: {
                    campaign_id: document.getElementById('filterCampaign').value,
                    router_id: document.getElementById('filterRouter').value,
                    start_date: document.getElementById('filterStartDate').value,
                    end_date: document.getElementById('filterEndDate').value,
                    consent_only: document.getElementById('filterConsent').checked
                },
                socketId: socket.id
            };

            try {
                const response = await apiRequest('/api/raffles/create-async', 'POST', raffleData);
                if (!response.success) throw new Error(response.message);
                progressStatusText.textContent = 'Processo iniciado no servidor. A aguardar atualizações...';
            } catch (error) {
                progressModalTitle.textContent = 'Erro ao Iniciar';
                progressStatusText.textContent = error.message;
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#ef4444';
                progressPercentage.textContent = 'Falha';
                progressModalActions.style.display = 'flex';
            } finally {
                submitButton.disabled = false;
            }
        };

        const handleDrawWinner = async (raffleId) => {
            progressModalTitle.textContent = 'A Realizar Sorteio...';
            progressStatusText.textContent = 'A enviar pedido...';
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = 'var(--primary-color)';
            progressPercentage.textContent = '0%';
            progressModalActions.style.display = 'none';
            progressModal.classList.remove('hidden');

            try {
                const response = await apiRequest(`/api/raffles/${raffleId}/draw-async`, 'POST', { socketId: socket.id });
                if (!response.success) throw new Error(response.message);
                progressStatusText.textContent = 'Sorteio iniciado. A aguardar resultado...';
            } catch (error) {
                progressModalTitle.textContent = 'Erro ao Iniciar';
                progressStatusText.textContent = error.message;
                progressBar.style.width = '100%';
                progressBar.style.backgroundColor = '#ef4444';
                progressPercentage.textContent = 'Falha';
                progressModalActions.style.display = 'flex';
            }
        };

        const showDetails = async (raffleId) => {
            detailsContent.innerHTML = '<p>A carregar detalhes...</p>';
            detailsModal.classList.remove('hidden');
            try {
                const response = await apiRequest(`/api/raffles/${raffleId}`);
                const details = response.data;
                let participantsHtml = '<h4>Nenhum participante.</h4>';
                if (details.participants && details.participants.length > 0) {
                    participantsHtml = '<ul>' + details.participants.map(p => `<li>${p.nome_completo} (${p.email})</li>`).join('') + '</ul>';
                }
                detailsContent.innerHTML = `
                    <h2>${details.title}</h2>
                    <p><strong>Observação:</strong> ${details.observation || 'Nenhuma'}</p>
                    <p><strong>Filtros Aplicados:</strong> <pre>${JSON.stringify(details.filters, null, 2)}</pre></p>
                    <h3>Participantes (${details.participants.length})</h3>
                    ${participantsHtml}
                `;
            } catch (error) {
                detailsContent.innerHTML = `<p style="color: red;">Erro ao carregar detalhes: ${error.message}</p>`;
            }
        };

        const handleDelete = async (raffleId) => {
            const confirmed = await showConfirmationModal(`Tem a certeza que deseja eliminar o sorteio ID ${raffleId} e todos os seus participantes?`);
            if (confirmed) {
                try {
                    await apiRequest(`/api/raffles/${raffleId}`, 'DELETE');
                    showNotification('Sorteio eliminado com sucesso.', 'success');
                    loadRaffles();
                } catch (error) {
                    showNotification(`Erro ao eliminar: ${error.message}`, 'error');
                }
            }
        };

        // --- EVENT LISTENERS ---
        createRaffleForm.addEventListener('submit', handleCreateRaffle);

        rafflesTableBody.addEventListener('click', (e) => {
            const target = e.target;
            const raffleId = target.closest('button')?.dataset.id;
            if (!raffleId) return;

            if (target.closest('.btn-draw')) {
                handleDrawWinner(raffleId);
            } else if (target.closest('.btn-details')) {
                showDetails(raffleId);
            } else if (target.closest('.btn-delete')) {
                handleDelete(raffleId);
            }
        });

        detailsCloseBtn.addEventListener('click', () => detailsModal.classList.add('hidden'));
        closeProgressModalBtn.addEventListener('click', () => {
            progressModal.classList.add('hidden');
            loadRaffles();
        });

        // --- INICIALIZAÇÃO ---
        loadRaffles();
        // Carregar filtros de campanha e roteador (lógica a ser adicionada)
    };
}
