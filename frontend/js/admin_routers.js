// Ficheiro: js/admin_routers.js
if (window.initRoutersPage) {
    console.warn("Tentativa de carregar admin_routers.js múltiplas vezes.");
} else {
    window.initRoutersPage = () => {
        console.log("A inicializar a página de gestão de Roteadores...");
        const checkStatusBtn = document.getElementById('checkStatusBtn');
        const groupPrefixes = { 'CS': 'Cidade Sol', 'RT': 'Rota Transportes', 'GB': 'Grupo Brasileiro', 'EB': 'Expresso Brasileiro', 'MKT': 'Marketing', 'VM': 'Via Metro', 'VIP': 'Sala Vip', 'GNC': 'Genérico' };

        // --- Elementos do DOM ---
        const groupsTableBody = document.querySelector('#groupsTable tbody');
        const routersTableBody = document.querySelector('#routersTable tbody');
        
        const addGroupBtn = document.getElementById('addGroupBtn');
        const groupModal = document.getElementById('groupModal');
        const groupForm = document.getElementById('groupForm');
        
        const routerModal = document.getElementById('routerModal');
        const routerForm = document.getElementById('routerForm');

        const discoverRoutersBtn = document.getElementById('discoverRoutersBtn');
        const discoverModal = document.getElementById('discoverModal');
        const discoverForm = document.getElementById('discoverForm');
        
        // [ADICIONADO] Elementos dos Cartões de Estatísticas
        const totalRoutersCard = document.getElementById('totalRouters');
        const totalGroupsCard = document.getElementById('totalGroups');
        
        let allRouters = [];
        let allGroups = [];

        // --- Funções Principais de Carregamento ---

        const loadPageData = async () => {
            try {
                // [MODIFICADO] Adicionado "A carregar..." aos cartões
                totalRoutersCard.textContent = '...';
                totalGroupsCard.textContent = '...';

                [allGroups, allRouters] = await Promise.all([
                    apiRequest('/api/routers/groups'),
                    apiRequest('/api/routers')
                ]);

                // [ADICIONADO] Atualiza os cartões de estatísticas
                totalRoutersCard.textContent = allRouters.length;
                totalGroupsCard.textContent = allGroups.length;

                // Continua a carregar o resto da página
                displayGroups();
                displayRouters();
            } catch (error) {
                console.error("Erro ao carregar dados da página:", error);
                // [ADICIONADO] Define "Erro" nos cartões se falhar
                totalRoutersCard.textContent = 'Erro';
                totalGroupsCard.textContent = 'Erro';
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

        const displayRouters = () => {
            routersTableBody.innerHTML = '';
            const groupMap = new Map(allGroups.map(group => [group.id, group.name]));
            if (!allRouters || allRouters.length === 0) {
                routersTableBody.innerHTML = '<tr><td colspan="6">Nenhum roteador encontrado.</td></tr>';
                return;
            }
            allRouters.forEach(router => {
                const row = document.createElement('tr');
                const groupName = router.group_id ? groupMap.get(router.group_id) || `ID: ${router.group_id}` : 'Nenhum';
                row.innerHTML = `
                    <td>${router.id}</td>
                    <td>${router.name}</td>
                    <td><span class="status-dot status-${router.status || 'offline'}"></span> ${router.status || 'offline'}</td>
                    <td>${groupName}</td>
                    <td>${router.observacao || 'N/A'}</td> 
                    <td class="action-buttons">
                        <button class="btn-edit" onclick="openModalForEditRouter(${router.id})">Editar</button>
                        <button class="btn-delete" onclick="handleDeleteRouter(${router.id})">Eliminar</button>
                    </td>
                `;
                routersTableBody.appendChild(row);
            });
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
                ip_address: document.getElementById('routerIpAddress').value || null // Envia o IP
            };
            try {
                const result = await apiRequest(`/api/routers/${routerId}`, 'PUT', routerData);
                showNotification(result.message, 'success');
                routerModal.classList.add('hidden');
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            }
        };
        
        
        window.handleDeleteRouter = async (routerId) => {
            const confirmed = await showConfirmationModal('Tem a certeza de que deseja eliminar este roteador? Ele será removido de qualquer grupo.');
            if (confirmed) {
                try {
                    const result = await apiRequest(`/api/routers/${routerId}`, 'DELETE');
                    showNotification(result.message, 'success');
                    loadPageData();
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            }
        };


        // --- NOVA LÓGICA DE VERIFICAÇÃO DE STATUS ---
        const handleCheckAllStatus = async () => {
            checkStatusBtn.disabled = true;
            checkStatusBtn.textContent = 'A verificar...';

            // Percorre cada linha da tabela para atualizar o status individualmente
            const rows = routersTableBody.querySelectorAll('tr');
            if (rows.length === 0) {
                 checkStatusBtn.disabled = false;
                 checkStatusBtn.textContent = 'Verificar Status';
                 showNotification('Nenhum roteador para verificar.', 'warning');
                 return;
            }

            for (const row of rows) {
                // Tenta extrair o ID do roteador da linha
                const idCell = row.cells[0];
                const routerId = parseInt(idCell.textContent, 10);
                
                if (!routerId) continue;
                
                const statusCell = row.cells[2];
                statusCell.innerHTML = 'Verificando...';

                try {
                    // Atualiza o objeto 'router' na cache 'allRouters'
                    const routerInCache = allRouters.find(r => r.id === routerId);
                    const result = await apiRequest(`/api/routers/${routerId}/ping`, 'POST');
                    
                    statusCell.innerHTML = `<span class="status-dot status-${result.status}"></span> ${result.status}`;
                    if (routerInCache) routerInCache.status = result.status; // Atualiza cache

                } catch (error) {
                    statusCell.innerHTML = `<span class="status-dot status-offline"></span> erro`;
                    const routerInCache = allRouters.find(r => r.id === routerId);
                    if (routerInCache) routerInCache.status = 'offline'; // Atualiza cache
                }
            }
            
            checkStatusBtn.disabled = false;
            checkStatusBtn.textContent = 'Verificar Status';
            showNotification('Verificação de status concluída.', 'success');
        };

        // --- Lógica de Deteção Automática ---

        const handleDiscoverRouters = async () => {
            try {
                const newRouters = await apiRequest('/api/routers/discover');
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

        const handlePrefixChange = () => {
            const groupPrefixSelect = document.getElementById('groupPrefix');
            const selectedPrefix = groupPrefixSelect.value;
            if (selectedPrefix && groupPrefixes[selectedPrefix]) {
                document.getElementById('groupName').value = `Grupo ${groupPrefixes[selectedPrefix]}`;
                document.getElementById('groupDescription').value = `Grupo de roteadores da ${groupPrefixes[selectedPrefix]}`;
            }
        };
        
        const loadRoutersIntoGroupModal = (currentGroupRouters = []) => {
            const routerListDiv = document.getElementById('routerListForGroup');
            routerListDiv.innerHTML = '';
            // Roteadores disponíveis são os que não têm grupo (group_id == null)
            // OU os que já estão neste grupo (currentGroupRouters)
            const availableRouters = allRouters.filter(r => r.group_id === null || currentGroupRouters.includes(r.id));
            
            if (availableRouters.length === 0) {
                 routerListDiv.innerHTML = '<p>Nenhum roteador disponível para adicionar ao grupo (todos os roteadores já pertencem a outros grupos).</p>';
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
            }
        };

        const openModalForCreateGroup = () => {
            groupForm.reset();
            document.getElementById('groupId').value = '';
            document.getElementById('groupModalTitle').textContent = 'Adicionar Novo Grupo';
            document.getElementById('groupPrefix').disabled = false;
            handlePrefixChange();
            loadRoutersIntoGroupModal();
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
        document.getElementById('groupPrefix').addEventListener('change', handlePrefixChange);
    };
}

