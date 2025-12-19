document.addEventListener('DOMContentLoaded', () => {
    const loadLgpdRequests = async () => {
        const tableBody = document.getElementById('lgpdRequestsTableBody');
        if (!tableBody) return;
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">A carregar pedidos...</td></tr>`;
        try {
            const response = await apiRequest('/api/lgpd/requests');
            if (!response.success || !response.data || !Array.isArray(response.data)) { // [CORRIGIDO] A API retorna o array em 'data'
                throw new Error(response.message || 'Resposta inválida da API de pedidos LGPD.');
            }
            const requests = response.data; // [CORRIGIDO]
            tableBody.innerHTML = '';
            if (requests.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum pedido de exclusão de dados encontrado.</td></tr>`;
                return;
            }
            requests.forEach(req => {
                const row = document.createElement('tr');
                const requestDate = new Date(req.request_date).toLocaleString('pt-BR');
                const completionDate = req.completion_date ? new Date(req.completion_date).toLocaleString('pt-BR') : 'N/A';
                row.innerHTML = `
                    <td>${req.user_email}</td>
                    <td>${requestDate}</td>
                    <td><span class="status-${req.status}">${req.status}</span></td>
                    <td>${completionDate}</td>
                    <td>${req.completed_by || 'N/A'}</td>
                    <td>
                        ${req.status === 'pending' ? `<button class="btn-primary btn-sm complete-lgpd-btn" data-id="${req.id}">Marcar como Concluído</button>` : ''}
                    </td>
                `;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.complete-lgpd-btn').forEach(btn => {
                btn.addEventListener('click', handleCompleteRequest);
            });
        } catch (error) {
            console.error("Erro ao carregar pedidos LGPD:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-danger);">Falha ao carregar pedidos. Tente novamente.</td></tr>`;
        }
    };

    const handleCompleteRequest = async (event) => {
        const requestId = event.target.dataset.id;
        if (!confirm(`Tem a certeza que deseja marcar o pedido ${requestId} como concluído?`)) {
            return;
        }
        try {
            const response = await apiRequest(`/api/lgpd/requests/${requestId}/complete`, 'PUT');
            if (response.success) {
                showNotification(response.message || 'Pedido marcado como concluído.', 'success');
                loadLgpdRequests();
            } else {
                throw new Error(response.message || 'Falha ao marcar o pedido como concluído.');
            }
        } catch (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        }
    };

    const searchLgpdUsers = async (event) => {
        if (event) event.preventDefault();
        const searchTerm = document.getElementById('lgpdSearchTerm').value;
        const searchType = document.getElementById('lgpdSearchType').value;
        const tableBody = document.getElementById('lgpdUserSearchResultsBody');
        if (!searchTerm) {
            showNotification('Por favor, insira um termo de pesquisa.', 'info');
            return;
        }
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">A pesquisar...</td></tr>`;
        try {
            const response = await apiRequest(`/api/lgpd/search-users?searchTerm=${searchTerm}&searchType=${searchType}`);
            if (!response.success || !response.data || !Array.isArray(response.data)) { // [CORRIGIDO] A API retorna o array em 'data'
                throw new Error(response.message || 'Resposta inválida da API de pesquisa de utilizadores.');
            }
            const users = response.data; // [CORRIGIDO]
            tableBody.innerHTML = '';
            if (users.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum utilizador encontrado.</td></tr>`;
                return;
            }
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.nome_completo || 'N/A'}</td>
                    <td>${user.username}</td>
                    <td>${user.telefone || 'N/A'}</td>
                    <td>${user.mac_address || 'N/A'}</td>
                    <td>
                        <button class="btn-danger btn-sm delete-lgpd-user-btn" data-id="${user.id}" data-email="${user.username}">Eliminar</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
            document.querySelectorAll('.delete-lgpd-user-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteUser);
            });
        } catch (error) {
            console.error("Erro ao pesquisar utilizadores LGPD:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-danger);">Falha ao pesquisar. Tente novamente.</td></tr>`;
        }
    };

    const handleDeleteUser = async (event) => {
        const userId = event.target.dataset.id;
        const userEmail = event.target.dataset.email;
        if (!confirm(`Tem a certeza que deseja eliminar permanentemente o utilizador ${userEmail} (ID: ${userId})? Esta ação não pode ser desfeita.`)) {
            return;
        }
        try {
            const response = await apiRequest(`/api/lgpd/users/${userId}`, 'DELETE');
            if (response.success) {
                showNotification(response.message || 'Utilizador eliminado com sucesso.', 'success');
                const tableBody = document.getElementById('lgpdUserSearchResultsBody');
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Utilizador eliminado. Faça uma nova pesquisa.</td></tr>`;
            } else {
                throw new Error(response.message || 'Falha ao eliminar o utilizador.');
            }
        } catch (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        }
    };

    const searchUserLgpdForm = document.getElementById('searchUserLgpdForm');
    if (searchUserLgpdForm) {
        searchUserLgpdForm.addEventListener('submit', searchLgpdUsers);
    }

    // [NOVO] Variável para armazenar os logs carregados para exportação
    let lgpdActivityLogs = [];

    // [NOVO] Função para carregar os logs de atividade LGPD
    const loadLgpdActivityLogs = async () => {
        const tableBody = document.getElementById('lgpdLogsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">A carregar logs...</td></tr>`;

        try {
            const response = await apiRequest('/api/lgpd/logs');
            if (!response.success || !Array.isArray(response.data)) {
                throw new Error(response.message || 'Resposta inválida da API de logs LGPD.');
            }

            lgpdActivityLogs = response.data; // Armazena os logs
            tableBody.innerHTML = ''; // Limpa a tabela

            if (lgpdActivityLogs.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum log encontrado.</td></tr>`;
                return;
            }

            lgpdActivityLogs.forEach(log => {
                const row = document.createElement('tr');
                const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
                // Simplificamos a exibição para caber no painel lateral
                const actionLabel = log.action === 'LGPD_REQUEST_COMPLETE' ? 'Conclusão' : 'Eliminação';
                const user = log.user_email || 'Sistema';

                row.innerHTML = `
                    <td style="white-space: normal;">${timestamp}<br><small style="color: var(--text-secondary);">${user}</small></td>
                    <td><span class="badge role-estetica">${actionLabel}</span></td>
                    <td style="white-space: normal; font-size: 12px;">${log.description || ''}</td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error("Erro ao carregar logs de atividade LGPD:", error);
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--color-danger);">Falha ao carregar logs.</td></tr>`;
        }
    };

    // [NOVO] Funções de exportação
    const exportLgpdLogsToCSV = () => {
        if (lgpdActivityLogs.length === 0) {
            showNotification('Não há logs para exportar.', 'info');
            return;
        }
        const header = ["Data/Hora", "Administrador", "IP", "Ação", "Status", "Descrição"];
        const csv = [
            header.join(','),
            ...lgpdActivityLogs.map(log => [
                `"${new Date(log.timestamp).toLocaleString('pt-BR')}"`,
                `"${log.user_email || 'N/A'}"`,
                `"${log.ip_address || 'N/A'}"`,
                `"${log.action}"`,
                `"${log.status}"`,
                `"${(log.description || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'logs_atividade_lgpd.csv';
        link.click();
    };

    const exportLgpdLogsToExcel = () => {
        if (lgpdActivityLogs.length === 0) {
            showNotification('Não há logs para exportar.', 'info');
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(lgpdActivityLogs.map(log => ({ "Data/Hora": new Date(log.timestamp).toLocaleString('pt-BR'), "Administrador": log.user_email || 'N/A', "IP": log.ip_address || 'N/A', "Ação": log.action, "Status": log.status, "Descrição": log.description || '' })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Logs LGPD");
        XLSX.writeFile(workbook, "logs_atividade_lgpd.xlsx");
    };

    document.getElementById('exportLgpdCsvBtn')?.addEventListener('click', exportLgpdLogsToCSV);
    document.getElementById('exportLgpdExcelBtn')?.addEventListener('click', exportLgpdLogsToExcel);

    // [NOVO] Lógica do Painel Lateral
    const logsSidebar = document.getElementById('logsSidebar');
    const openLogsBtn = document.getElementById('openLogsBtn');
    const closeLogsBtn = document.getElementById('closeLogsBtn');

    if (openLogsBtn && logsSidebar) {
        openLogsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logsSidebar.classList.add('open');
            loadLgpdActivityLogs(); // Recarrega os logs ao abrir
        });
    }

    if (closeLogsBtn && logsSidebar) {
        closeLogsBtn.addEventListener('click', () => {
            logsSidebar.classList.remove('open');
        });
    }

    loadLgpdRequests();
});