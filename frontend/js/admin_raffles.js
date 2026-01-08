// Ficheiro: frontend/js/admin_raffles.js
// Descrição: Contém a lógica do lado do cliente para a página de sorteios.

window.initRafflesPage = () => {
    const createRaffleForm = document.getElementById('createRaffleForm');
    const rafflesTableBody = document.querySelector('#rafflesTable tbody');

    // Carregar sorteios na inicialização
    loadRaffles();

    // Carregar dados para os filtros
    loadFilterOptions();

    async function loadFilterOptions() {
        try {
            const [campaignsRes, routersRes] = await Promise.all([
                apiRequest('/api/raffles/data/campaigns'),
                apiRequest('/api/raffles/data/routers')
            ]);

            if (campaignsRes.success && campaignsRes.data) { // [CORRIGIDO] Verifica se 'data' existe
                const campaignSelect = document.getElementById('filterCampaign');
                campaignsRes.data.forEach(campaign => { // [CORRIGIDO] A API retorna o array em 'data'
                    const option = document.createElement('option');
                    option.value = campaign.id;
                    option.textContent = campaign.name;
                    campaignSelect.appendChild(option);
                });
            }

            if (routersRes.success && routersRes.data) { // [CORRIGIDO] Verifica se 'data' existe
                const routerSelect = document.getElementById('filterRouter');
                routersRes.data.forEach(router => { // [CORRIGIDO] A API retorna o array em 'data'
                    const option = document.createElement('option');
                    option.value = router.id;
                    option.textContent = router.name;
                    routerSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('Erro ao carregar opções de filtro:', error);
        }
    }

    createRaffleForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const title = document.getElementById('raffleTitle').value;
        const observation = document.getElementById('raffleObservation').value;
        const filters = {
            campaign: document.getElementById('filterCampaign').value,
            router: document.getElementById('filterRouter').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
            consent: document.getElementById('filterConsent').checked
        };

        window.showPagePreloader('A criar sorteio...'); // [NOVO] Inicia o loader

        try {
            const response = await apiRequest('/api/raffles', 'POST', { title, observation, filters });
            if (response.success) {
                showNotification('Sorteio criado com sucesso!', 'success');
                loadRaffles();
                createRaffleForm.reset();
            } else {
                showNotification('Erro ao criar sorteio: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao criar sorteio:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        } finally {
            window.hidePagePreloader(); // [NOVO] Remove o loader
        }
    });

    async function loadRaffles() {
        window.showPagePreloader('A carregar sorteios...');
        try {
            const response = await apiRequest('/api/raffles');
            if (response.success && response.data) { // [CORRIGIDO] Verifica se 'data' existe
                renderRaffles(response.data); // [CORRIGIDO] A API retorna o array em 'data'
            } else {
                showNotification('Erro ao carregar sorteios: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar sorteios:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        } finally {
            window.hidePagePreloader();
        }
    }

    function renderRaffles(raffles) {
        rafflesTableBody.innerHTML = '';
        raffles.forEach(raffle => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${raffle.raffle_number}</td>
                <td>${raffle.title}</td>
                <td>${new Date(raffle.created_at).toLocaleString()}</td>
                <td>${raffle.winner_email || 'N/A'}</td>
                <td class="action-buttons">
                    <button class="btn-secondary view-raffle-btn" data-id="${raffle.id}" title="Ver Detalhes"><i class="fas fa-eye"></i></button>
                    <button class="btn-primary draw-raffle-btn" data-id="${raffle.id}" ${raffle.winner_id ? 'disabled' : ''} title="Realizar Sorteio"><i class="fas fa-trophy"></i></button>
                </td>
            `;
            rafflesTableBody.appendChild(row);
        });
    }

    async function viewRaffle(id) {
        try {
            const response = await apiRequest(`/api/raffles/${id}`);
            if (response.success && response.data) { // [CORRIGIDO] Verifica se 'data' existe
                const raffle = response.data; // [CORRIGIDO] A API retorna o objeto em 'data'
                let participantsList = '';
                if (raffle.participants.length > 0) {
                    participantsList = raffle.participants.map(p => `<li>${p.email}</li>`).join('');
                } else {
                    participantsList = '<li>Nenhum participante ainda.</li>';
                }

                const raffleDetailsContent = document.getElementById('raffleDetailsContent');
                raffleDetailsContent.innerHTML = `
                    <h2>${raffle.title}</h2>
                    <p><strong>Número do Sorteio:</strong> ${raffle.raffle_number}</p>
                    <p><strong>Observação:</strong> ${raffle.observation || 'N/A'}</p>
                    <p><strong>Vencedor:</strong> ${raffle.winner_email || 'Ainda não sorteado'}</p>
                    <h3>Participantes</h3>
                    <ul>${participantsList}</ul>
                    <button class="btn-secondary export-raffle-btn" data-id="${raffle.id}">Exportar Resultados</button>
                `;

                const modal = document.getElementById('raffleDetailsModal');
                modal.classList.remove('hidden');

                const closeModalBtn = modal.querySelector('.modal-close-btn');
                closeModalBtn.onclick = () => modal.classList.add('hidden');

            } else {
                showNotification('Erro ao carregar detalhes do sorteio: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do sorteio:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        }
    }

    async function drawRaffle(id) {
        const confirmed = await showConfirmationModal(
            'Tem certeza que deseja realizar este sorteio? Esta ação não pode ser desfeita e um vencedor será escolhido aleatoriamente.',
            'Realizar Sorteio'
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await apiRequest(`/api/raffles/${id}/draw`, 'POST');
            if (response.success && response.data && response.data.winner) { // [CORRIGIDO] Verifica se 'data' e 'winner' existem
                // [NOVO] Modal festivo para o vencedor
                const winnerEmail = response.data.winner.email;
                const modalHtml = `
                    <div id="winnerModal" class="modal-overlay visible" style="z-index: 10000;">
                        <div class="modal-content" style="text-align: center; max-width: 400px;">
                            <div style="font-size: 4rem; margin-bottom: 10px;">🎉</div>
                            <h2 style="color: var(--primary-color); margin-bottom: 10px;">Temos um Vencedor!</h2>
                            <p style="font-size: 1.2rem; margin-bottom: 20px; color: var(--text-primary); font-weight: bold;">
                                ${winnerEmail}
                            </p>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">O sorteio foi realizado com sucesso.</p>
                            <div class="modal-actions" style="justify-content: center; margin-top: 20px;">
                                <button class="btn-primary" onclick="document.getElementById('winnerModal').remove()">Fechar</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                loadRaffles(); // Recarregar a lista de sorteios
            } else {
                showNotification('Erro ao realizar o sorteio: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao realizar o sorteio:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        }
    }

    async function exportRaffleResults(id) {
        try {
            const response = await apiRequest(`/api/raffles/${id}`);
            if (response.success && response.data) { // [CORRIGIDO] Verifica se 'data' existe
                const raffle = response.data; // [CORRIGIDO] A API retorna o objeto em 'data'
                const results = [];

                results.push([
                    'Sorteio',
                    'Número do Sorteio',
                    'Email do Participante',
                    'Vencedor'
                ]);

                raffle.participants.forEach(participant => {
                    results.push([
                        raffle.title,
                        raffle.raffle_number,
                        participant.email,
                        raffle.winner_email === participant.email ? 'Sim' : 'Não'
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(results);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
                XLSX.writeFile(wb, `sorteio_${raffle.raffle_number}.xlsx`);

            } else {
                showNotification('Erro ao exportar resultados: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao exportar resultados:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        }
    }

    rafflesTableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('view-raffle-btn')) {
            viewRaffle(event.target.dataset.id);
        }
        if (event.target.classList.contains('draw-raffle-btn')) {
            drawRaffle(event.target.dataset.id);
        }
    });

    document.getElementById('raffleDetailsModal').addEventListener('click', (event) => {
        if (event.target.classList.contains('export-raffle-btn')) {
            exportRaffleResults(event.target.dataset.id);
        }
    });
};

async function viewRaffle(id) {
    window.showPagePreloader('A carregar detalhes...'); // [NOVO] Inicia o loader

    try {
        const response = await apiRequest(`/api/raffles/${id}`);
        if (response.success && response.data) { // [CORRIGIDO] Verifica se 'data' existe
            const raffle = response.data; // [CORRIGIDO] A API retorna o objeto em 'data'
            let participantsList = '';
            if (raffle.participants.length > 0) {
                participantsList = raffle.participants.map(p => `<li>${p.email}</li>`).join('');
            } else {
                participantsList = '<li>Nenhum participante ainda.</li>';
            }

            const raffleDetailsContent = document.getElementById('raffleDetailsContent');
            raffleDetailsContent.innerHTML = `
                <h2>${raffle.title}</h2>
                <p><strong>Número do Sorteio:</strong> ${raffle.raffle_number}</p>
                <p><strong>Observação:</strong> ${raffle.observation || 'N/A'}</p>
                <p><strong>Vencedor:</strong> ${raffle.winner_email || 'Ainda não sorteado'}</p>
                <h3>Participantes</h3>
                <ul>${participantsList}</ul>
                <button class="btn-secondary" onclick="exportRaffleResults(${raffle.id})">Exportar Resultados</button>
            `;

            const modal = document.getElementById('raffleDetailsModal');
            modal.classList.remove('hidden');

            const closeModalBtn = modal.querySelector('.modal-close-btn');
            closeModalBtn.onclick = () => modal.classList.add('hidden');

        } else {
            alert('Erro ao carregar detalhes do sorteio: ' + response.message);
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes do sorteio:', error);
        alert('Erro ao conectar com o servidor.');
    } finally {
        window.hidePagePreloader(); // [NOVO] Remove o loader
    }
}

async function drawRaffle(id) {
    if (!confirm('Tem certeza que deseja realizar este sorteio? Esta ação não pode ser desfeita.')) {
        return;
    }

    window.showPagePreloader('A realizar sorteio...'); // [NOVO] Inicia o loader

    try {
        const response = await apiRequest(`/api/raffles/${id}/draw`, 'POST');
        if (response.success && response.data && response.data.winner) { // [CORRIGIDO] Verifica se 'data' e 'winner' existem
            alert(`O vencedor é: ${response.data.winner.email}`); // [CORRIGIDO] A API retorna o objeto em 'data'
            loadRaffles(); // Recarregar a lista de sorteios
        } else {
            alert('Erro ao realizar o sorteio: ' + response.message);
        }
    } catch (error) {
        console.error('Erro ao realizar o sorteio:', error);
        alert('Erro ao conectar com o servidor.');
    } finally {
        if (btn) btn.disabled = false; // Reativa o botão (embora a lista seja recarregada)
        window.hidePagePreloader(); // [NOVO] Remove o loader
    }
}

async function exportRaffleResults(id) {
    window.showPagePreloader('A exportar resultados...'); // [NOVO] Inicia o loader

    try {
        const response = await apiRequest(`/api/raffles/${id}`);
        if (response.success && response.data) { // [CORRIGIDO] Verifica se 'data' existe
            const raffle = response.data; // [CORRIGIDO] A API retorna o objeto em 'data'
            const results = [];

            results.push([
                'Sorteio',
                'Número do Sorteio',
                'Email do Participante',
                'Vencedor'
            ]);

            raffle.participants.forEach(participant => {
                results.push([
                    raffle.title,
                    raffle.raffle_number,
                    participant.email,
                    raffle.winner_email === participant.email ? 'Sim' : 'Não'
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(results);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
            XLSX.writeFile(wb, `sorteio_${raffle.raffle_number}.xlsx`);

        } else {
            alert('Erro ao exportar resultados: ' + response.message);
        }
    } catch (error) {
        console.error('Erro ao exportar resultados:', error);
        alert('Erro ao conectar com o servidor.');
    } finally {
        window.hidePagePreloader(); // [NOVO] Remove o loader
    }
}
