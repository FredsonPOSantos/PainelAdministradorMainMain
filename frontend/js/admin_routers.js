// Ficheiro: js/admin_routers.js
if (window.initRoutersPage) {
    console.warn("Tentativa de carregar admin_routers.js múltiplas vezes.");
} else {
    window.initRoutersPage = () => {
        console.log("A inicializar a página de gestão de Roteadores...");
        const groupPrefixes = { 'CS': 'Cidade Sol', 'RT': 'Rota Transportes', 'GB': 'Grupo Brasileiro', 'EB': 'Expresso Brasileiro', 'MKT': 'Marketing', 'VM': 'Via Metro', 'VIP': 'Sala Vip', 'GNC': 'Genérico' };

        // --- Elementos do DOM ---
        const groupsTableBody = document.querySelector('#groupsTable tbody');
        const routersTableBody = document.querySelector('#routersTable tbody');
        
        const addGroupBtn = document.getElementById('addGroupBtn');
        const groupModal = document.getElementById('groupModal');
        const checkStatusBtn = document.getElementById('checkStatusBtn');
        const groupForm = document.getElementById('groupForm');
        
        const routerModal = document.getElementById('routerModal');
        const routerForm = document.getElementById('routerForm');

        const discoverRoutersBtn = document.getElementById('discoverRoutersBtn');
        const discoverModal = document.getElementById('discoverModal');
        const discoverForm = document.getElementById('discoverForm');

        // [NOVO] Cria e injeta o botão de exportar para Excel ao lado dos outros botões de ação
        if (checkStatusBtn && checkStatusBtn.parentElement) {
            const exportExcelBtn = document.createElement('button');
            exportExcelBtn.id = 'exportExcelBtn';
            exportExcelBtn.className = 'btn-secondary';
            exportExcelBtn.innerHTML = '<i class="fas fa-file-excel" style="margin-right: 8px;"></i>Exportar Excel';
            // Adiciona o botão no mesmo container que o "Verificar Status"
            checkStatusBtn.parentElement.appendChild(exportExcelBtn);

            // [NOVO] Cria e injeta o campo de pesquisa
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.id = 'routerSearchInput';
            searchInput.placeholder = 'Pesquisar (Nome/IP)...';
            searchInput.style.cssText = 'padding: 6px 12px; margin-left: 10px; border: 1px solid #4B5563; border-radius: 4px; background-color: #374151; color: #fff; width: 200px;';
            
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allRouters.filter(r => r.name.toLowerCase().includes(term) || (r.ip_address && r.ip_address.includes(term)));
                displayRouters(filtered, 1); // [NOVO] Reseta para a primeira página ao pesquisar
            });
            checkStatusBtn.parentElement.appendChild(searchInput);
        }
        
        // [NOVO] Cria e injeta o container da paginação abaixo da tabela
        const tableContainer = document.querySelector('#routersTable')?.parentElement;
        if (tableContainer) {
            const paginationContainer = document.createElement('div');
            paginationContainer.id = 'routersPagination';
            paginationContainer.className = 'pagination-container';
            tableContainer.appendChild(paginationContainer);
        }
        
        // [ADICIONADO] Elementos dos Cartões de Estatísticas
        const totalRoutersCard = document.getElementById('totalRouters');
        const totalGroupsCard = document.getElementById('totalGroups');
        
        let allRouters = [];
        let allGroups = [];

        // [NOVO] Variáveis de estado para paginação
        let currentPage = 1;
        const rowsPerPage = 15; // Define quantos roteadores por página

        // [NOVO] Injeta a coluna de Latência no cabeçalho da tabela se não existir
        // Isso evita a necessidade de editar o arquivo HTML manualmente
        const tableHeadRow = document.querySelector('#routersTable thead tr');
        if (tableHeadRow && !tableHeadRow.innerHTML.includes('Latência')) {
             const latencyTh = document.createElement('th');
             latencyTh.textContent = 'Latência';
             // Insere após a coluna de Status (índice 2, então insere antes do índice 3)
             if (tableHeadRow.children.length > 3) tableHeadRow.insertBefore(latencyTh, tableHeadRow.children[3]);
             else tableHeadRow.appendChild(latencyTh);
        }

        // --- Funções Principais de Carregamento ---

        const loadPageData = async () => {
            window.showPagePreloader('A carregar roteadores...');
            try {
                // [MODIFICADO] Adicionado "A carregar..." aos cartões
                totalRoutersCard.textContent = '...';
                totalGroupsCard.textContent = '...';

                const [groupsResponse, routersResponse] = await Promise.all([
                    apiRequest('/api/routers/groups'),
                    apiRequest('/api/routers')
                ]);
                allGroups = groupsResponse; // [CORRIGIDO] A API retorna o array diretamente
                allRouters = routersResponse; // [CORRIGIDO] A API retorna o array diretamente

                // [ADICIONADO] Atualiza os cartões de estatísticas
                totalRoutersCard.textContent = allRouters.length; // [CORRIGIDO]
                totalGroupsCard.textContent = allGroups.length; // [CORRIGIDO]

                // Continua a carregar o resto da página
                displayGroups();
                displayRouters();
            } catch (error) {
                console.error("Erro ao carregar dados da página:", error);
                // [ADICIONADO] Define "Erro" nos cartões se falhar
                totalRoutersCard.textContent = 'Erro';
                totalGroupsCard.textContent = 'Erro';
            } finally {
                window.hidePagePreloader();
            }
        };

        const displayGroups = () => {
            groupsTableBody.innerHTML = '';
            if (!allGroups || allGroups.length === 0) {
                groupsTableBody.innerHTML = '<tr><td colspan="5">Nenhum grupo encontrado.</td></tr>';
                return;
            }
            allGroups.forEach(group => {
                const row = document.createElement('tr');
                // [MODIFICADO] router_count agora vem da API de grupos
                const routerCount = allRouters.filter(r => r.group_id === group.id).length;
                row.innerHTML = `
                    <td>${group.id}</td>
                    <td>${group.name}</td>
                    <td>${group.observacao || 'N/A'}</td>
                    <td>${routerCount}</td> 
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="openModalForEditGroup(${group.id})">Editar</button>
                        <button class="btn-delete" onclick="handleDeleteGroup(${group.id})">Eliminar</button>
                    </td>
                `;
                groupsTableBody.appendChild(row);
            });
        };

        const displayRouters = (routersList = allRouters, page = currentPage) => {
            currentPage = page;
            routersTableBody.innerHTML = '';
            const groupMap = new Map(allGroups.map(group => [group.id, group.name]));

            // [NOVO] Lógica de paginação
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = startIndex + rowsPerPage;
            const paginatedItems = routersList.slice(startIndex, endIndex);

            if (paginatedItems.length === 0) {
                routersTableBody.innerHTML = '<tr><td colspan="7">Nenhum roteador encontrado.</td></tr>';
                renderPagination(0, routersList); // Limpa a paginação
                return;
            }

            paginatedItems.forEach(router => {
                const row = document.createElement('tr');
                const groupName = router.group_id ? groupMap.get(router.group_id) || `ID: ${router.group_id}` : 'Nenhum';
                row.innerHTML = `
                    <td>${router.id}</td>
                    <td>${router.name}</td>
                    <td><span class="status-dot status-${router.status || 'offline'}"></span> ${router.status || 'offline'}</td>
                    <td class="latency-cell">-</td>
                    <td>${groupName}</td>
                    <td>${router.observacao || 'N/A'}</td> 
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="openModalForEditRouter(${router.id})">Editar</button>
                        <button class="btn-delete" onclick="handleDeleteRouter(${router.id})">Eliminar</button>
                    </td>
                `;
                routersTableBody.appendChild(row);
            });

            // [NOVO] Renderiza os controlos da paginação
            renderPagination(routersList.length, routersList);
        };

        // [NOVO] Função para renderizar os botões de paginação
        const renderPagination = (totalItems, listToPaginate) => {
            const paginationContainer = document.getElementById('routersPagination');
            if (!paginationContainer) return;

            const totalPages = Math.ceil(totalItems / rowsPerPage);
            paginationContainer.innerHTML = '';

            if (totalPages <= 1) return;

            const createButton = (text, page, isDisabled = false, isActive = false) => {
                const button = document.createElement('button');
                button.textContent = text;
                button.disabled = isDisabled;
                if (isActive) button.classList.add('active');
                button.addEventListener('click', () => displayRouters(listToPaginate, page));
                return button;
            };

            // Botão "Anterior"
            paginationContainer.appendChild(createButton('Anterior', currentPage - 1, currentPage === 1));

            // Botões de página (simplificado para mostrar apenas a página atual)
            const pageInfo = document.createElement('span');
            pageInfo.className = 'pagination-info';
            pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
            paginationContainer.appendChild(pageInfo);

            // Botão "Próximo"
            paginationContainer.appendChild(createButton('Próximo', currentPage + 1, currentPage === totalPages));
        };

        // --- Lógica para Roteadores Individuais (Edição e Eliminação) ---
        
        window.openModalForEditRouter = (routerId) => {
            const router = allRouters.find(r => r.id === routerId);
            if (!router) return;
            routerForm.reset();
            document.getElementById('routerId').value = router.id;
            document.getElementById('routerName').value = router.name;
            document.getElementById('routerIpAddress').value = router.ip_address || ''; // Preenche o IP
            document.getElementById('routerDescription').value = router.observacao;
            routerModal.classList.remove('hidden');
        };


        const handleRouterFormSubmit = async (event) => {
            event.preventDefault();
            const routerId = document.getElementById('routerId').value;
            const routerData = { 
                observacao: document.getElementById('routerDescription').value,
                ip_address: document.getElementById('routerIpAddress').value || null
            };
            try {
                const result = await apiRequest(`/api/routers/${routerId}`, 'PUT', routerData);
                showNotification(result.message, 'success');
                routerModal.classList.add('hidden');
                loadPageData(); // Recarrega para atualizar a lista local
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            }
        };
        
        window.handleDeleteRouter = async (routerId) => {
            const hasPermanentDeletePermission = window.currentUserProfile?.permissions['routers.individual.delete_permanent'];

            const modalTitle = 'Confirmar Exclusão de Roteador';
            const modalMessage = 'Como deseja proceder com a exclusão?';
            
            const modalButtons = [
                { text: 'Cancelar', value: 'cancel', class: 'btn-secondary' },
                { text: 'Remover (Manter Histórico)', value: 'soft_delete', class: 'btn-delete' }
            ];

            if (hasPermanentDeletePermission) {
                modalButtons.push({ text: 'Excluir Permanentemente', value: 'permanent_delete', class: 'btn-danger' });
            }

            const userChoice = await showConfirmationModal(modalMessage, modalTitle, modalButtons);

            if (userChoice === 'cancel' || !userChoice) {
                showNotification('Operação cancelada.', 'info');
                return;
            }

            let endpoint = '';
            if (userChoice === 'soft_delete') {
                endpoint = `/api/routers/${routerId}`;
            } else if (userChoice === 'permanent_delete' && hasPermanentDeletePermission) {
                endpoint = `/api/routers/${routerId}/permanent`;
            } else {
                return; // Nenhuma ação válida
            }

            try {
                const result = await apiRequest(endpoint, 'DELETE');
                showNotification(result.message, 'success');
                loadPageData();
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            }
        };

        // [NOVO] Variável de controle para cancelamento
        let isCheckingStatus = false;

        // --- NOVA LÓGICA DE VERIFICAÇÃO DE STATUS ---
        const handleCheckAllStatus = async () => {
            // Se já estiver a verificar, o clique serve para cancelar
            if (isCheckingStatus) {
                isCheckingStatus = false;
                checkStatusBtn.textContent = 'A cancelar...';
                checkStatusBtn.disabled = true; // Evita cliques múltiplos enquanto para
                return;
            }

            isCheckingStatus = true;
            checkStatusBtn.textContent = 'Cancelar'; // Muda o botão para Cancelar
            checkStatusBtn.classList.add('btn-danger'); // Adiciona estilo visual de alerta (opcional)

            // Percorre cada linha da tabela para atualizar o status individualmente
            const rows = routersTableBody.querySelectorAll('tr');
            if (rows.length === 0) {
                 isCheckingStatus = false;
                 checkStatusBtn.textContent = 'Verificar Status';
                 checkStatusBtn.classList.remove('btn-danger');
                 showNotification('Nenhum roteador para verificar.', 'warning');
                 return;
            }

            // [NOVO] Cria a barra de progresso
            const progressContainer = document.createElement('div');
            progressContainer.style.cssText = 'margin-top: 10px; width: 100%; background: #374151; border-radius: 4px; overflow: hidden; height: 8px;';
            const progressBar = document.createElement('div');
            progressBar.style.cssText = 'width: 0%; height: 100%; background: #10b981; transition: width 0.2s ease;';
            progressContainer.appendChild(progressBar);
            checkStatusBtn.parentNode.insertBefore(progressContainer, checkStatusBtn.nextSibling);

            let processedCount = 0;
            const totalCount = rows.length;

            for (const row of rows) {
                // [NOVO] Verifica se o processo foi cancelado ou se o utilizador saiu da página
                // document.body.contains(checkStatusBtn) retorna false se o botão não estiver mais no DOM (mudança de página)
                if (!isCheckingStatus || !document.body.contains(checkStatusBtn)) {
                    isCheckingStatus = false;
                    break;
                }

                // Tenta extrair o ID do roteador da linha
                const idCell = row.cells[0];
                const routerId = parseInt(idCell.textContent, 10);
                
                if (!routerId) continue;
                
                const statusCell = row.cells[2];
                const latencyCell = row.cells[3]; // [NOVO] Célula de latência

                statusCell.innerHTML = 'Verificando...';
                latencyCell.textContent = '...';

                try {
                    // Atualiza o objeto 'router' na cache 'allRouters'
                    const routerInCache = allRouters.find(r => r.id === routerId);
                    const pingResponse = await apiRequest(`/api/routers/${routerId}/ping`, 'POST');

                    // [CORRIGIDO] A API de ping retorna { status: 'online' } diretamente.
                    // A verificação de 'success' e 'data' não se aplica aqui.
                    if (pingResponse && pingResponse.status) {
                        statusCell.innerHTML = `<span class="status-dot status-${pingResponse.status}"></span> ${pingResponse.status}`;
                        
                        // [NOVO] Atualiza a latência com cores indicativas
                        if (pingResponse.latency !== null && pingResponse.latency !== undefined) {
                            latencyCell.textContent = `${pingResponse.latency} ms`;
                            if (pingResponse.latency < 50) latencyCell.style.color = '#10b981'; // Verde (Bom)
                            else if (pingResponse.latency < 150) latencyCell.style.color = '#f59e0b'; // Amarelo (Médio)
                            else latencyCell.style.color = '#ef4444'; // Vermelho (Alto)
                        } else {
                            latencyCell.textContent = '-';
                            latencyCell.style.color = '';
                        }

                        if (routerInCache) routerInCache.status = pingResponse.status; // Atualiza cache
                    } else {
                        throw new Error("Resposta inválida da API de ping.");
                    }

                } catch (error) {
                    statusCell.innerHTML = `<span class="status-dot status-offline"></span> erro`;
                    latencyCell.textContent = '-';
                    const routerInCache = allRouters.find(r => r.id === routerId);
                    if (routerInCache) routerInCache.status = 'offline'; // Atualiza cache
                }

                // [NOVO] Atualiza a barra de progresso
                processedCount++;
                progressBar.style.width = `${(processedCount / totalCount) * 100}%`;
            }
            
            // Reset do estado
            isCheckingStatus = false;
            checkStatusBtn.disabled = false;
            checkStatusBtn.textContent = 'Verificar Status';
            checkStatusBtn.classList.remove('btn-danger');

            // Remove a barra de progresso após um pequeno delay
            setTimeout(() => progressContainer.remove(), 1000);
            
            if (processedCount < totalCount) {
                showNotification('Verificação cancelada.', 'info');
            } else {
                showNotification('Verificação de status concluída.', 'success');
            }
        };

        // [NOVO] Função para exportar os dados da tabela para um ficheiro Excel
        const exportRoutersToExcel = () => {
            // Verifica se a biblioteca SheetJS (XLSX) está disponível
            if (typeof XLSX === 'undefined') {
                showNotification("Erro: A biblioteca de exportação para Excel não foi carregada.", 'error');
                console.error("SheetJS (XLSX) library not found. Make sure it's included in the main HTML file.");
                return;
            }

            const rows = routersTableBody.querySelectorAll('tr');
            if (rows.length === 0 || (rows.length === 1 && rows[0].textContent.includes('Nenhum roteador'))) {
                showNotification('Não há dados de roteadores para exportar.', 'info');
                return;
            }

            const dataToExport = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 6) return; // Ignora linhas inválidas

                // Extrai os dados de cada célula, limpando o texto
                dataToExport.push({
                    'ID': cells[0].textContent.trim(),
                    'Nome': cells[1].textContent.trim(),
                    'Status': cells[2].textContent.trim(),
                    'Latência': cells[3].textContent.trim(),
                    'Grupo': cells[4].textContent.trim(),
                    'Observação': cells[5].textContent.trim()
                });
            });

            if (dataToExport.length === 0) {
                showNotification('Não foram encontrados dados válidos para exportar.', 'info');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Roteadores");
            XLSX.writeFile(workbook, `Relatorio_Roteadores_${new Date().toISOString().slice(0, 10)}.xlsx`);
        };

        // --- Lógica de Deteção Automática ---

        const handleDiscoverRouters = async () => {
            try {
                // [CORRIGIDO] A função apiRequest retorna um objeto { success, data }.
                // O array de roteadores está em response.data.
                const response = await apiRequest('/api/routers/discover');
                if (!response.success) throw new Error(response.message);

                // [CORRIGIDO] A resposta da API está aninhada. O array está em response.data.data.
                // [CORRIGIDO] Torna a verificação mais robusta, usando um array vazio como fallback se 'data' não existir.
                const newRouters = response.data || [];

                const discoveredRouterList = document.getElementById('discoveredRouterList');
                discoveredRouterList.innerHTML = '';
                if (newRouters.length === 0) {
                    showNotification('Nenhum roteador novo foi detetado na rede.', 'info');
                    return;
                }
                newRouters.forEach(name => {
                    const item = document.createElement('div');
                    item.className = 'checkbox-item';
                    item.innerHTML = `
                        <input type="checkbox" id="discover-${name}" name="routerNames" value="${name}" checked>
                        <label for="discover-${name}"><span class="checkbox-item-name">${name}</span></label>
                    `;
                    discoveredRouterList.appendChild(item);
                });
                discoverModal.classList.remove('hidden');
            } catch (error) {
                showNotification(`Erro ao verificar novos roteadores: ${error.message}`, 'error');
            }
        };

        const handleBatchAddSubmit = async (event) => {
            event.preventDefault();
            const selectedCheckboxes = discoverModal.querySelectorAll('input[name="routerNames"]:checked');
            const routerNames = Array.from(selectedCheckboxes).map(cb => cb.value);
            if (routerNames.length === 0) {
                showNotification('Por favor, selecione pelo menos um roteador para adicionar.', 'warning');
                return;
            }
            try {
                const result = await apiRequest('/api/routers/batch-add', 'POST', { routerNames });
                showNotification(result.message, 'success');
                discoverModal.classList.add('hidden');
                loadPageData();
            } catch (error)
 {
                showNotification(`Erro ao adicionar roteadores: ${error.message}`, 'error');
            }
        };

        // --- Lógica para Grupos de Roteadores ---

        const populatePrefixSelector = () => {
            const groupPrefixSelect = document.getElementById('groupPrefix');
            groupPrefixSelect.innerHTML = '<option value="">Selecionar para preencher...</option>';
            for (const prefix in groupPrefixes) {
                groupPrefixSelect.innerHTML += `<option value="${prefix}">${prefix} - ${groupPrefixes[prefix]}</option>`;
            }
        };

        const handlePrefixChangeAndFilter = () => {
            const groupPrefixSelect = document.getElementById('groupPrefix');
            const selectedPrefix = groupPrefixSelect.value;

            if (selectedPrefix && groupPrefixes[selectedPrefix]) {
                document.getElementById('groupName').value = `Grupo ${groupPrefixes[selectedPrefix]}`;
                document.getElementById('groupDescription').value = `Grupo de roteadores da ${groupPrefixes[selectedPrefix]}`;
            }

            // Filtra os roteadores com base no prefixo
            loadRoutersIntoGroupModal([], selectedPrefix);
        };
        
        const loadRoutersIntoGroupModal = (currentGroupRouters = [], prefix = '') => {
            const routerListDiv = document.getElementById('routerListForGroup');
            routerListDiv.innerHTML = '';

            let routersToDisplay = allRouters;

            if (prefix && prefix !== 'GNC') {
                routersToDisplay = allRouters.filter(r => r.name.startsWith(prefix));
            }

            // Roteadores disponíveis são os que não têm grupo (group_id == null)
            // OU os que já estão neste grupo (currentGroupRouters)
            const availableRouters = routersToDisplay.filter(r => r.group_id === null || currentGroupRouters.includes(r.id));

            if (availableRouters.length === 0) {
                routerListDiv.innerHTML = '<p>Nenhum roteador disponível para adicionar ao grupo (todos os roteadores já pertencem a outros grupos ou não correspondem ao filtro).</p>';
                return;
            }

            availableRouters.forEach(router => {
                const isChecked = currentGroupRouters.includes(router.id) ? 'checked' : '';
                const itemHTML = `
                    <label class="checkbox-item" for="group-router-${router.id}">
                        <input type="checkbox" id="group-router-${router.id}" name="routerIds" value="${router.id}" ${isChecked}>
                        <div class="checkbox-item-text">
                            <span class="checkbox-item-name">${router.name}</span>
                            <span class="checkbox-item-description">${router.observacao || 'Sem descrição.'}</span>
                        </div>
                    </label>`;
                routerListDiv.innerHTML += itemHTML;
            });
        };


        const handleGroupFormSubmit = async (event) => {
            event.preventDefault();
            window.showPagePreloader('A salvar grupo...');
            const groupId = document.getElementById('groupId').value;
            const selectedCheckboxes = groupModal.querySelectorAll('input[name="routerIds"]:checked');
            const routerIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
            
            // [MODIFICADO] A validação de 2 roteadores foi removida para permitir grupos vazios ou com 1.
            
            const groupData = {
                name: document.getElementById('groupName').value,
                observacao: document.getElementById('groupDescription').value,
                routerIds // Envia a lista de IDs de roteadores para o backend
            };
            
            const method = groupId ? 'PUT' : 'POST';
            const endpoint = groupId ? `/api/routers/groups/${groupId}` : '/api/routers/groups';
            
            try {
                const result = await apiRequest(endpoint, method, groupData);
                showNotification(result.message, 'success');
                groupModal.classList.add('hidden');
                loadPageData(); // Recarrega tudo
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            } finally {
                window.hidePagePreloader();
            }
        };

        const openModalForCreateGroup = () => {
            groupForm.reset();
            document.getElementById('groupId').value = '';
            document.getElementById('groupModalTitle').textContent = 'Adicionar Novo Grupo';
            document.getElementById('groupPrefix').disabled = false;
            handlePrefixChangeAndFilter(); // Chama a nova função para preencher e filtrar
            groupModal.classList.remove('hidden');
        };

        window.openModalForEditGroup = (groupId) => {
            const group = allGroups.find(g => g.id === groupId);
            if (!group) return;
            groupForm.reset();
            document.getElementById('groupId').value = group.id;
            document.getElementById('groupModalTitle').textContent = 'Editar Grupo';
            document.getElementById('groupName').value = group.name;
            document.getElementById('groupDescription').value = group.observacao;
            document.getElementById('groupPrefix').value = '';
            document.getElementById('groupPrefix').disabled = true;
            // Carrega os roteadores que pertencem a este grupo
            const currentGroupRouters = allRouters.filter(r => r.group_id === groupId).map(r => r.id);
            loadRoutersIntoGroupModal(currentGroupRouters);
            groupModal.classList.remove('hidden');
        };

        window.handleDeleteGroup = async (groupId) => {
            const confirmed = await showConfirmationModal('Tem a certeza de que deseja eliminar este grupo? Os roteadores associados não serão eliminados, ficarão apenas "Sem Grupo".');
            if (confirmed) {
                try {
                    const result = await apiRequest(`/api/routers/groups/${groupId}`, 'DELETE');
                    showNotification(result.message, 'success');
                    loadPageData();
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            }
        };
        
        // --- INICIALIZAÇÃO E LISTENERS ---
        loadPageData();
        populatePrefixSelector();

        checkStatusBtn.addEventListener('click', handleCheckAllStatus);

        // [NOVO] Adiciona o listener para o botão de exportar
        const exportBtn = document.getElementById('exportExcelBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', exportRoutersToExcel);
        }

        
        routerForm.addEventListener('submit', handleRouterFormSubmit);
        routerModal.querySelector('.modal-close-btn').addEventListener('click', () => routerModal.classList.add('hidden'));
        routerModal.querySelector('#cancelRouterBtn').addEventListener('click', () => routerModal.classList.add('hidden'));

        discoverRoutersBtn.addEventListener('click', handleDiscoverRouters);
        discoverForm.addEventListener('submit', handleBatchAddSubmit);
        discoverModal.querySelector('.modal-close-btn').addEventListener('click', () => discoverModal.classList.add('hidden'));
        discoverModal.querySelector('#cancelDiscoverBtn').addEventListener('click', () => discoverModal.classList.add('hidden'));
        
        addGroupBtn.addEventListener('click', openModalForCreateGroup);
        groupForm.addEventListener('submit', handleGroupFormSubmit);
        groupModal.querySelector('.modal-close-btn').addEventListener('click', () => groupModal.classList.add('hidden'));
        groupModal.querySelector('#cancelGroupBtn').addEventListener('click', () => groupModal.classList.add('hidden'));
        document.getElementById('groupPrefix').addEventListener('change', handlePrefixChangeAndFilter);
    };
}
