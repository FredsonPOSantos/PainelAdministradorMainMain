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

        // [NOVO] Função de limpeza para desconectar o socket ao sair da página
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

                // [NOVO] Dispara confetes se houver um vencedor (sucesso no sorteio)
                if (data.winner && window.confetti) {
                    const duration = 3000;
                    const end = Date.now() + duration;
                    (function frame() {
                        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
                        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
                        if (Date.now() < end) requestAnimationFrame(frame);
                    }());
                }
            }
        });

        // --- FUNÇÕES DE LÓGICA ---

        // [NOVO] Função para carregar os filtros dinâmicos
        const loadFilters = async () => {
            const campaignSelect = document.getElementById('filterCampaign');
            const routerSelect = document.getElementById('filterRouter');

            try {
                const [campaignsRes, routersRes] = await Promise.all([
                    apiRequest('/api/campaigns'),
                    apiRequest('/api/routers')
                ]);

                // Popula campanhas
                if (campaignsRes) {
                    campaignsRes.forEach(c => {
                        const option = document.createElement('option');
                        option.value = c.id;
                        option.textContent = c.name;
                        campaignSelect.appendChild(option);
                    });
                }

                // Popula roteadores
                if (routersRes) {
                    routersRes.forEach(r => {
                        const option = document.createElement('option');
                        option.value = r.id;
                        option.textContent = r.name;
                        routerSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error("Erro ao carregar filtros para sorteios:", error);
            }
        };

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
                    const winnerName = raffle.winner_name || (raffle.draw_date ? 'Sorteado, sem nome' : 'Pendente');
                    const dateDisplay = raffle.created_at ? new Date(raffle.created_at).toLocaleString('pt-BR') : 'Data Indisponível';
                    // [MODIFICADO] Botão de sortear agora é um ícone para manter consistência visual
                    const drawBtn = !raffle.draw_date ? `<button class="btn-primary btn-sm btn-draw" data-id="${raffle.id}" title="Realizar Sorteio"><i class="fas fa-trophy"></i></button>` : '';
                    
                    // [NOVO] Botão de excluir visível APENAS para DPO
                    const deleteBtn = (window.currentUserProfile && window.currentUserProfile.role === 'DPO') 
                        ? `<button class="btn-delete btn-sm" data-id="${raffle.id}" title="Excluir (Restrito DPO)"><i class="fas fa-trash-alt"></i></button>`
                        : '';

                    row.innerHTML = `
                        <td>${raffle.id}</td>
                        <td>${raffle.title}<br><small style="color:var(--text-secondary)">${raffle.raffle_number || ''}</small></td>
                        <td>${dateDisplay}</td>
                        <td>${winnerName}</td>
                        <td class="action-buttons">
                            <button class="btn-secondary btn-sm btn-details" data-id="${raffle.id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                            ${drawBtn}
                            ${deleteBtn}
                        </td>
                    `;
                    rafflesTableBody.appendChild(row);
                });
            } catch (error) {
                const dbError = error.details?.db_error ? `<br><small>Detalhe: ${error.details.db_error}</small>` : '';
                rafflesTableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar sorteios: ${error.message}${dbError}</td></tr>`;
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

        // [NOVO] Função auxiliar para formatar os filtros de forma legível
        const formatFiltersDisplay = (filters) => {
            if (!filters) return '<span style="color: var(--text-secondary);">Nenhum filtro aplicado.</span>';
            
            let filterObj = filters;
            if (typeof filters === 'string') {
                try { filterObj = JSON.parse(filters); } catch (e) { return filters; }
            }

            // Mapeamento de chaves para rótulos amigáveis
            const labels = {
                'campaign_id': 'Campanha', 'campaign': 'Campanha',
                'router_id': 'Roteador', 'router': 'Roteador',
                'start_date': 'Data Início', 'startDate': 'Data Início',
                'end_date': 'Data Fim', 'endDate': 'Data Fim',
                'consent_only': 'Apenas Marketing', 'consent': 'Apenas Marketing'
            };

            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; background: var(--background-dark); padding: 15px; border-radius: 8px; border: 1px solid var(--border-color);">';
            let hasFilters = false;

            for (const [key, value] of Object.entries(filterObj)) {
                if (value === '' || value === null || value === undefined) continue;
                
                hasFilters = true;
                let displayValue = value;
                let displayKey = labels[key] || key;

                if (key.toLowerCase().includes('date')) {
                    // [CORREÇÃO] Tratamento manual de strings de data (YYYY-MM-DD) para evitar deslocamento de fuso horário
                    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        const [year, month, day] = value.split('-');
                        displayValue = `${day}/${month}/${year}`;
                    } else {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) displayValue = date.toLocaleDateString('pt-BR');
                    }
                } else if (typeof value === 'boolean' || value === 'true' || value === 'false') {
                    displayValue = (value === true || value === 'true') ? 'Sim' : 'Não';
                }

                html += `<div style="display: flex; flex-direction: column;">
                            <span style="font-size: 0.8em; color: var(--text-secondary); text-transform: uppercase;">${displayKey}</span>
                            <span style="font-weight: 600; color: var(--text-primary);">${displayValue}</span>
                         </div>`;
            }
            html += '</div>';
            return hasFilters ? html : '<span style="color: var(--text-secondary);">Nenhum filtro específico (Todos).</span>';
        };

        const showDetails = async (raffleId) => {
            detailsContent.innerHTML = '<p>A carregar detalhes...</p>';
            detailsModal.classList.remove('hidden');
            try {
                const response = await apiRequest(`/api/raffles/${raffleId}`);
                const details = response.data;
                let participantsHtml = '<h4>Nenhum participante.</h4>';
                if (details.participants && details.participants.length > 0) {
                    // [MODIFICADO] Renderiza uma tabela com ícones em vez de lista simples
                    participantsHtml = `
                        <div style="margin-bottom: 10px;">
                            <input type="text" id="searchParticipantInput" placeholder="Buscar participante (nome ou email)..." 
                                   style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--background-dark); color: var(--text-primary);">
                        </div>
                        <div class="table-container" style="border: 1px solid var(--border-color); border-radius: 6px;">
                            <table id="participantsTable" style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
                                <thead style="position: sticky; top: 0; background: var(--background-medium); z-index: 1;">
                                    <tr>
                                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid var(--border-color);">Nome</th>
                                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid var(--border-color);">Email</th>
                                        <th style="text-align: center; padding: 10px; border-bottom: 2px solid var(--border-color);">Mkt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${details.participants.map(p => {
                                        const icon = p.accepts_marketing 
                                            ? '<i class="fas fa-check-circle" style="color: #38a169; font-size: 1.1em;" title="Aceitou Marketing"></i>' 
                                            : '<i class="fas fa-times-circle" style="color: #e53e3e; font-size: 1.1em; opacity: 0.5;" title="Não Aceitou"></i>';
                                        return `
                                            <tr style="border-bottom: 1px solid var(--border-color);">
                                                <td style="padding: 8px 10px;">${p.nome_completo || 'N/A'}</td>
                                                <td style="padding: 8px 10px;">${p.email}</td>
                                                <td style="text-align: center; padding: 8px 10px;">${icon}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `;
                }

                // [NOVO] Botão de exportação
                const exportBtnHtml = `
                    <button id="exportRaffleBtn" class="btn-secondary" style="padding: 5px 10px; font-size: 12px; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-file-excel"></i> Exportar Resultados
                    </button>`;

                // [NOVO] Lógica para Tag de Marketing e Texto Explicativo
                let filtersObj = details.filters;
                if (typeof filtersObj === 'string') {
                    try { filtersObj = JSON.parse(filtersObj); } catch (e) {}
                }
                
                const isMarketingRestricted = filtersObj?.consent_only === true || filtersObj?.consent === true || filtersObj?.consent === 'true';
                
                const marketingTag = isMarketingRestricted
                    ? '<span class="badge" style="background-color: #38a169; color: white; margin-left: 10px; font-size: 0.75em; vertical-align: middle; padding: 4px 8px; border-radius: 12px;"><i class="fas fa-check-circle"></i> Apenas Marketing Aceite</span>'
                    : '<span class="badge" style="background-color: #718096; color: white; margin-left: 10px; font-size: 0.75em; vertical-align: middle; padding: 4px 8px; border-radius: 12px;">Todos os Participantes</span>';

                const logicExplanation = `
                    <div style="margin: 20px 0; padding: 15px; background-color: rgba(66, 153, 225, 0.1); border-left: 4px solid var(--primary-color); border-radius: 4px;">
                        <h4 style="margin-top: 0; margin-bottom: 8px; font-size: 14px; color: var(--text-primary);"><i class="fas fa-info-circle"></i> Lógica do Sorteio</h4>
                        <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                            O sistema seleciona aleatoriamente um único vencedor a partir da lista de participantes elegíveis exibida abaixo. 
                            A seleção é realizada no servidor utilizando um algoritmo seguro de geração de números aleatórios, garantindo que todos os participantes tenham igual probabilidade de serem contemplados.
                        </p>
                    </div>
                `;
                
                detailsContent.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <h2 style="margin: 0;">${details.title}</h2>
                            ${marketingTag}
                        </div>
                        ${details.participants.length > 0 ? exportBtnHtml : ''}
                    </div>
                    <p><strong>Observação:</strong> ${details.observation || 'Nenhuma'}</p>
                    <div style="margin: 15px 0;"><strong>Filtros Aplicados:</strong><br>${formatFiltersDisplay(details.filters)}</div>
                    
                    ${logicExplanation}

                    <h3>Participantes (${details.participants.length})</h3>
                    ${participantsHtml}
                `;

                // Adiciona listener ao botão de exportar
                const exportBtn = document.getElementById('exportRaffleBtn');
                if (exportBtn) {
                    exportBtn.onclick = () => exportRaffleResults(details);
                }

                // [NOVO] Lógica de busca de participantes
                const searchInput = document.getElementById('searchParticipantInput');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        const term = e.target.value.toLowerCase();
                        const rows = document.querySelectorAll('#participantsTable tbody tr');
                        rows.forEach(row => {
                            const text = row.innerText.toLowerCase();
                            row.style.display = text.includes(term) ? '' : 'none';
                        });
                    });
                }
            } catch (error) {
                // [MODIFICADO] Tenta exibir o erro específico do banco de dados, se disponível.
                const dbError = error.details?.db_error ? `<br><small>Detalhe: ${error.details.db_error}</small>` : '';
                detailsContent.innerHTML = `<p style="color: red;">Erro ao carregar detalhes: ${error.message}${dbError}</p>`;
            }
        };

        // [NOVO] Função para exportar resultados do sorteio
        const exportRaffleResults = (details) => {
            if (typeof XLSX === 'undefined') {
                showNotification("Biblioteca XLSX não carregada.", 'error');
                return;
            }

            const data = details.participants.map(p => ({
                "ID": p.id,
                "Nome": p.nome_completo,
                "Email": p.email,
                "Status": (details.winner_id && p.id === details.winner_id) ? "VENCEDOR 🏆" : "Participante"
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Resultados");
            XLSX.writeFile(wb, `Sorteio_${details.raffle_number || details.id}.xlsx`);
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
        loadFilters();
        loadRaffles();
    };
}