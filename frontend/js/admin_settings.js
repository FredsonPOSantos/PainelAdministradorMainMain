// Ficheiro: frontend/js/admin_settings.js
// [VERSÃO 14.2 - INICIALIZAÇÃO ROBUSTA]

let originalPermissionsState = {}; // Mantém esta variável global para o estado das permissões

window.initSettingsPage = () => {
    // [CORRIGIDO] Move a verificação para dentro e usa uma variável local ou de escopo mais restrito.
    // A melhor abordagem é simplesmente permitir a reinicialização.
    console.log("A inicializar a página de Configurações (V14.3 - Reinicialização)...");

    let initialAppearanceSettings = {}; // Armazena o estado inicial das configurações de aparência

    // --- Seletores de Elementos ---
    const changeOwnPasswordForm = document.getElementById('changeOwnPasswordForm');
        const unifiedAppearanceForm = document.getElementById('unifiedAppearanceForm');
        const removeBackgroundBtn = document.getElementById('removeBackground');
        const smtpSettingsForm = document.getElementById('smtpSettingsForm'); // [NOVO] Seletor para o novo formulário
        const removeLoginLogoBtn = document.getElementById('removeLoginLogo');
        const backgroundUploadInput = document.getElementById('backgroundUpload');
        const loginBgColorInput = document.getElementById('loginBackgroundColor');
        const tabLinks = document.querySelectorAll('.tab-nav .tab-link');
        const tabContents = document.querySelectorAll('.tab-content-container .tab-content');
        const resetAppearanceBtn = document.getElementById('resetAppearanceBtn');

        // --- Elementos da Aba de Permissões (NOVO LAYOUT) ---
        const permissionsGridContainer = document.getElementById('permissionsGridContainer');
        const permissionsError = document.getElementById('permissionsError');
        const permHelpTextMaster = document.getElementById('permHelpTextMaster');
        const permHelpTextDPO = document.getElementById('permHelpTextDPO');
        const permSaveChangesContainer = document.getElementById('permSaveChangesContainer');
        const permSaveChangesBtn = document.getElementById('permSaveChangesBtn');
        const permSaveStatus = document.getElementById('permSaveStatus');

        // --- LÓGICA DA ABA DE PERMISSÕES (REFEITA) ---

        const handleSavePermissions = async () => {
            if (!permSaveChangesBtn) return;
            if (permSaveStatus) permSaveStatus.textContent = 'A guardar...';
            permSaveChangesBtn.disabled = true;

            const changes = [];
            const checkboxes = permissionsGridContainer.querySelectorAll('input[type="checkbox"]');

            checkboxes.forEach(box => {
                const key = `${box.dataset.role}|${box.dataset.permission}`;
                if (box.checked !== originalPermissionsState[key]) {
                    changes.push({
                        role: box.dataset.role,
                        permission: box.dataset.permission,
                        checked: box.checked
                    });
                }
            });

            if (changes.length === 0) {
                if (permSaveStatus) permSaveStatus.textContent = 'Nenhuma alteração detetada.';
                permSaveChangesBtn.disabled = false;
                setTimeout(() => { if (permSaveStatus) permSaveStatus.textContent = ''; }, 3000);
                return;
            }

            try {
                const response = await apiRequest('/api/permissions/update-batch', 'POST', { changes });
                if (permSaveStatus) {
                    permSaveStatus.textContent = response.message || 'Alterações guardadas!';
                    permSaveStatus.style.color = 'var(--success-text)';
                }
                // Atualiza o estado original para o novo estado salvo
                changes.forEach(change => {
                    originalPermissionsState[`${change.role}|${change.permission}`] = change.checked;
                });
            } catch (error) {
                if (permSaveStatus) {
                    permSaveStatus.textContent = `Erro: ${error.message}`;
                    permSaveStatus.style.color = 'var(--error-text)';
                }
            } finally {
                permSaveChangesBtn.disabled = false;
                setTimeout(() => { if (permSaveStatus) { permSaveStatus.textContent = ''; permSaveStatus.style.color = ''; } }, 4000);
            }
        };



        // --- Lógica de Abas ---
        const switchTab = (targetTabId) => {
            if (!targetTabId) return;
            tabContents.forEach(c => c.classList.remove('active'));
            tabLinks.forEach(l => l.classList.remove('active'));
            const targetContent = document.getElementById(targetTabId);
            const targetLink = document.querySelector(`.tab-nav .tab-link[data-tab="${targetTabId}"]`);
            if (targetContent) targetContent.classList.add('active');
            if (targetLink) targetLink.classList.add('active');
        };

        // --- Lógica de Reset ---
        const handleResetAppearance = async () => {
            const confirmed = await showConfirmationModal(
                'Tem a certeza de que deseja repor TODAS as configurações de aparência para os valores predefinidos? Esta ação não pode ser desfeita.',
                'Repor Predefinições de Aparência'
            );

            if (!confirmed) {
                showNotification('A operação foi cancelada.', 'info');
                return;
            }

            try {
                const result = await apiRequest('/api/settings/appearance/reset', 'PUT');
                if (result.success) {
                    showNotification('As configurações de aparência foram repostas com sucesso.', 'success');
                    // Recarrega as configurações para atualizar o formulário e aplicar os estilos
                    await loadGeneralSettings();
                } else {
                    showNotification(result.message || 'Não foi possível repor as configurações.', 'error');
                }
            } catch (error) {
                showNotification(`Erro ao repor as configurações: ${error.message}`, 'error');
            }
        };


        const renderPermissionsGrid = (matrixData, selectedRole, isMaster) => {
            const grid = permissionsGridContainer.querySelector('.permissions-grid');
            if (!grid) return;

            grid.innerHTML = '';
            originalPermissionsState = {}; // Limpa o estado ao renderizar

            const groups = matrixData.permissions.reduce((acc, p) => {
                acc[p.feature_name] = acc[p.feature_name] || [];
                acc[p.feature_name].push(p);
                return acc;
            }, {});

            for (const featureName in groups) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'permission-group';

                const title = document.createElement('h4');
                title.textContent = featureName;
                groupDiv.appendChild(title);

                groups[featureName].forEach(permission => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'permission-item';

                    const permissionKey = permission.permission_key;
                    const isChecked = matrixData.assignments[selectedRole]?.[permissionKey] === true;
                    const stateKey = `${selectedRole}|${permissionKey}`;
                    originalPermissionsState[stateKey] = isChecked;

                    if (isMaster) {
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `perm-${stateKey}`;
                        checkbox.checked = isChecked;
                        checkbox.dataset.role = selectedRole;
                        checkbox.dataset.permission = permissionKey;

                        if (permissionKey.startsWith('lgpd.')) {
                            checkbox.disabled = true;
                        }

                        const label = document.createElement('label');
                        label.htmlFor = checkbox.id;
                        label.textContent = permission.action_name;

                        itemDiv.appendChild(checkbox);
                        itemDiv.appendChild(label);
                    } else {
                        itemDiv.innerHTML = `<span class="permission-readonly ${isChecked ? 'allowed' : ''}">${isChecked ? '✓' : '—'}</span> <span>${permission.action_name}</span>`;
                    }
                    groupDiv.appendChild(itemDiv);
                });
                grid.appendChild(groupDiv);
            }
        };

        const loadPermissionsMatrix = async () => {
            if (!permissionsGridContainer) return false;
            if (permissionsError) permissionsError.textContent = '';
            permissionsGridContainer.innerHTML = '<p>A carregar...</p>';

            const role = window.currentUserProfile?.role;
            if (role !== 'master' && role !== 'DPO') {
                permissionsGridContainer.innerHTML = '<p>Acesso negado.</p>';
                return false;
            }

            const isMaster = (role === 'master');
            if (permHelpTextMaster) permHelpTextMaster.style.display = isMaster ? 'block' : 'none';
            if (permHelpTextDPO) permHelpTextDPO.style.display = !isMaster ? 'block' : 'none';

            try {
                const response = await apiRequest('/api/permissions/matrix');
                if (!response.success) {
                    throw new Error(response.message || "Erro desconhecido ao carregar matriz de permissões.");
                }
                const matrixData = response.data;
                permissionsGridContainer.innerHTML = ''; // Limpa o "A carregar..."

                // Cria o seletor de Role
                const header = document.createElement('div');
                header.className = 'permissions-header';
                const inputGroup = document.createElement('div');
                inputGroup.className = 'input-group';
                const label = document.createElement('label');
                label.htmlFor = 'permissionRoleSelect';
                label.textContent = 'Selecione a Função para Editar';
                const select = document.createElement('select');
                select.id = 'permissionRoleSelect';

                matrixData.roles.forEach(roleName => {
                    if (roleName !== 'master') { // Master não pode ser editado
                        const option = document.createElement('option');
                        option.value = roleName;
                        option.textContent = roleName.charAt(0).toUpperCase() + roleName.slice(1);
                        select.appendChild(option);
                    }
                });
                
                inputGroup.appendChild(label);
                inputGroup.appendChild(select);
                header.appendChild(inputGroup);
                permissionsGridContainer.appendChild(header);

                // Cria a grid
                const grid = document.createElement('div');
                grid.className = 'permissions-grid';
                permissionsGridContainer.appendChild(grid);

                // Renderiza as permissões para a role selecionada
                renderPermissionsGrid(matrixData, select.value, isMaster);

                // Adiciona listener para trocar de role
                select.addEventListener('change', (e) => {
                    renderPermissionsGrid(matrixData, e.target.value, isMaster);
                });

                // [NOVO] Adiciona listener para dependências de permissão
                grid.addEventListener('change', (event) => {
                    const checkbox = event.target;
                    if (checkbox.type !== 'checkbox' || !checkbox.checked) {
                        return; // Só age ao marcar a caixa
                    }

                    const permissionKey = checkbox.dataset.permission;
                    const parts = permissionKey.split('.');

                    if (parts.length > 1) {
                        const feature = parts[0];
                        const action = parts[1];

                        // Se a ação for criar, atualizar ou apagar, garante que a leitura também está marcada
                        if (['create', 'update', 'delete'].includes(action)) {
                            const readPermissionKey = `${feature}.read`;
                            const readCheckbox = grid.querySelector(`input[data-permission="${readPermissionKey}"]`);
                            if (readCheckbox && !readCheckbox.checked) {
                                readCheckbox.checked = true;
                            }
                        }
                    }
                });

                if (isMaster) {
                    if (permSaveChangesContainer) permSaveChangesContainer.style.display = 'block';
                    if (permSaveChangesBtn) {
                        permSaveChangesBtn.removeEventListener('click', handleSavePermissions);
                        permSaveChangesBtn.addEventListener('click', handleSavePermissions);
                    }
                }
                return true;
            } catch (error) {
                if (permissionsError) permissionsError.textContent = `Erro: ${error.message}`;
                return false;
            }
        };

        // --- Lógica de Formulários ---
        const handleChangeOwnPassword = async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const submitButton = form.querySelector('button[type="submit"]');
            const currentPassword = document.getElementById('currentPassword').value;
            const newVoluntaryPassword = document.getElementById('newVoluntaryPassword').value;
            const confirmNewVoluntaryPassword = document.getElementById('confirmNewVoluntaryPassword').value;

            if (newVoluntaryPassword !== confirmNewVoluntaryPassword) {
                showNotification('As novas senhas não coincidem.', 'error');
                return;
            }
            if (newVoluntaryPassword.length < 6) {
                showNotification('A nova senha deve ter no mínimo 6 caracteres.', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'A guardar...';

            try {
                const result = await apiRequest('/api/admin/profile/change-own-password', 'POST', {
                    currentPassword,
                    newPassword: newVoluntaryPassword
                });
                showNotification(result.message || 'Operação concluída.', result.success ? 'success' : 'error');
                if (result.success) form.reset();
            } catch (error) {
                showNotification(`Erro ao alterar a senha: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Alterar Senha';
            }
        };

        const handleUnifiedAppearance = async (e) => {
            e.preventDefault();
            const submitButton = document.getElementById('saveAppearanceBtn');
            if (!submitButton) return;

            const formData = new FormData();
            let hasChanges = false;

            // Mapeia IDs do formulário para chaves no objeto de configurações
            // [ADICIONADO] 'companyName' ao mapeamento
            const fieldMapping = {
                'primaryColor': 'primary_color',
                'backgroundColor': 'background_color',
                'sidebarColor': 'sidebar_color',
                'fontColor': 'font_color',
                'fontFamily': 'font_family',
                'fontSize': 'font_size',
                'modalBackgroundColor': 'modal_background_color',
                'modalFontColor': 'modal_font_color',
                'modalBorderColor': 'modal_border_color',
                'loginBackgroundColor': 'login_background_color',
                'loginFormBackgroundColor': 'login_form_background_color',
                'loginFontColor': 'login_font_color',
                'loginButtonColor': 'login_button_color',
                'companyName': 'company_name'
            };

            // 1. Compara campos de texto e cor
            for (const id in fieldMapping) {
                const element = document.getElementById(id);
                if (element) {
                    const initialValue = initialAppearanceSettings[fieldMapping[id]];
                    const currentValue = element.value;
                    // Compara valores, tratando `null` e `undefined` de forma similar a string vazia para inputs
                    if (String(initialValue || '') !== String(currentValue)) {
                        formData.append(fieldMapping[id], currentValue);
                        hasChanges = true;
                    }
                }
            }

            // 2. Verifica upload de ficheiros
            const loginLogoInput = document.getElementById('loginLogoUpload');
            if (loginLogoInput && loginLogoInput.files[0]) {
                const loginLogoFile = loginLogoInput.files[0];
                // FORÇA A ATUALIZAÇÃO: Mesmo que o nome do ficheiro seja o mesmo, o conteúdo é novo.
                // O backend irá gerar o novo URL com a extensão correta (.svg).
                formData.append('loginLogo', loginLogoFile);
                hasChanges = true;
            }

            const backgroundImageInput = document.getElementById('backgroundUpload');
            if (backgroundImageInput && backgroundImageInput.files[0]) {
                const backgroundImageFile = backgroundImageInput.files[0];
                formData.append('backgroundImage', backgroundImageFile);
                hasChanges = true;
            }

            const companyLogoFile = document.getElementById('logoUpload')?.files[0]; // Este pode ficar como está, pois é o principal
            if (companyLogoFile) { 
                formData.append('companyLogo', companyLogoFile);
                hasChanges = true;
            }

            // 3. Verifica remoção de imagens
            if (unifiedAppearanceForm.dataset.removeBackground === 'true') {
                formData.append('removeBackgroundImage', 'true');
                hasChanges = true;
            }
            if (unifiedAppearanceForm.dataset.removeLoginLogo === 'true') {
                formData.append('removeLoginLogo', 'true');
                hasChanges = true;
            }

            // 4. Se não houver alterações, notifica e pára
            if (!hasChanges) {
                showNotification("Nenhuma alteração detectada.", "info");
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'A guardar...';

            try {
                const result = await apiRequest('/api/settings/appearance', 'POST', formData);
                // LOG ADICIONADO: Mostra a resposta completa ao guardar
                console.log('%c[handleUnifiedAppearance] Resposta da API após guardar:', 'color: orange;', result);

                if (result.success && result.data && result.data.settings) {
                    window.systemSettings = result.data.settings;
                    if (window.applyVisualSettings) window.applyVisualSettings(result.data.settings);
                    // Recarrega as configurações para atualizar o estado inicial (`initialAppearanceSettings`)
                    await loadGeneralSettings(); 
                }
                showNotification(result.message || 'Configurações de aparência guardadas.', result.success ? 'success' : 'error');
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Todas as Alterações de Aparência';
                delete unifiedAppearanceForm.dataset.removeBackground;
                delete unifiedAppearanceForm.dataset.removeLoginLogo;
            }
        };

        /**
         * [NOVO] Lida com a submissão do formulário de configurações de SMTP.
         */
        const handleSmtpSettings = async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'A guardar...';

            try {
                const smtpData = {
                    email_host: document.getElementById('emailHost').value,
                    email_port: document.getElementById('emailPort').value,
                    email_user: document.getElementById('emailUser').value,
                    email_pass: document.getElementById('emailPass').value, // A senha, pode ser vazia
                    email_from: document.getElementById('emailFrom').value,
                    email_secure: document.getElementById('emailSecure').checked,
                };

                const result = await apiRequest('/api/settings/smtp', 'POST', smtpData);

                showNotification(result.message || 'Operação concluída.', result.success ? 'success' : 'error');
                if (result.success) {
                    document.getElementById('emailPass').value = ''; // Limpa o campo de senha por segurança
                }
            } catch (error) {
                showNotification(`Erro ao salvar configurações de SMTP: ${error.message}`, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Salvar Configurações de E-mail';
            }
        };

        // --- Lógica de Carregamento de Dados ---
        const loadGeneralSettings = async () => {
            try {
                const response = await apiRequest('/api/settings/general');
                if (!response || !response.data) {
                    showNotification('Não foi possível carregar as configurações de aparência.', 'error');
                    return;
                }
                const settings = response.data;
                
                // LOG ADICIONADO: Mostra os dados que serão usados para preencher o formulário
                console.log('%c[loadGeneralSettings] Configurações recebidas para preencher o formulário:', 'color: orange;', settings);

                // Guarda o estado inicial para detecção de alterações
                initialAppearanceSettings = { ...settings };

                const fields = {
                    'companyName': settings.company_name,
                    'primaryColor': settings.primary_color,
                    'backgroundColor': settings.background_color,
                    'sidebarColor': settings.sidebar_color,
                    'fontColor': settings.font_color,
                    'fontFamily': settings.font_family,
                    'fontSize': settings.font_size,
                    'modalBackgroundColor': settings.modal_background_color,
                    'modalFontColor': settings.modal_font_color,
                    'modalBorderColor': settings.modal_border_color,
                    'loginBackgroundColor': settings.login_background_color,
                    'loginFormBackgroundColor': settings.login_form_background_color,
                    'loginFontColor': settings.login_font_color,
                    'loginButtonColor': settings.login_button_color,
                    // [NOVO] Campos de SMTP
                    'emailHost': settings.email_host,
                    'emailPort': settings.email_port,
                    'emailUser': settings.email_user,
                    'emailFrom': settings.email_from,
                    // A senha não é preenchida por segurança
                };
                
                for (const id in fields) {
                    const el = document.getElementById(id);
                    if (el) {
                        // Se o valor for nulo ou indefinido, o campo ficará vazio,
                        // permitindo que o CSS ou o browser definam o valor visual padrão.
                        el.value = fields[id] || '';
                    }
                }

                // Preenche o checkbox de 'email_secure'
                const emailSecureCheckbox = document.getElementById('emailSecure');
                if (emailSecureCheckbox) {
                    emailSecureCheckbox.checked = !!settings.email_secure;
                }

                const updatePreview = (previewId, removeBtnId, url) => {
                    const preview = document.getElementById(previewId);
                    const removeBtn = document.getElementById(removeBtnId);
                    if (!preview) {
                        console.warn(`Elemento de preview não encontrado: ${previewId}`);
                        return;
                    }
                    const hasUrl = !!url;
                    preview.style.display = hasUrl ? 'block' : 'none';
                    if (hasUrl) preview.src = `http://${window.location.hostname}:3000${url}?v=${Date.now()}`;
                    
                    if (removeBtn) {
                        removeBtn.style.display = hasUrl ? 'inline-block' : 'none';
                    } else if (hasUrl) {
                        // Se há uma URL mas nenhum botão de remover, é bom estar ciente disso.
                        // Pode ser intencional (como no logo da empresa).
                        console.log(`Preview '${previewId}' atualizado, mas nenhum botão de remoção '${removeBtnId}' foi encontrado.`);
                    }
                };

                updatePreview('currentLogoPreview', 'removeLogo', settings.logo_url);
                updatePreview('currentBackgroundPreview', 'removeBackground', settings.background_image_url);
                updatePreview('currentLoginLogoPreview', 'removeLoginLogo', settings.login_logo_url);

                const loginBgColorInput = document.getElementById('loginBackgroundColor');
                if (loginBgColorInput) loginBgColorInput.disabled = !!settings.background_image_url;

            } catch (error) {
                console.error('Erro ao carregar configurações gerais:', error);
                showNotification('Falha ao carregar as configurações de aparência.', 'error');
            }
        };


        let auditLogs = []; // Variável para armazenar os logs carregados

        const loadAuditLogs = async (filters = {}) => {
            const tableBody = document.getElementById('auditLogsTableBody');
            if (!tableBody) return;

            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">A carregar logs...</td></tr>`;

            try {
                let endpoint = '/api/logs';
                const queryParams = new URLSearchParams();
                if (filters.keyword) {
                    queryParams.append('keyword', filters.keyword);
                }
                if (filters.startDate) {
                    queryParams.append('startDate', filters.startDate);
                }
                if (filters.endDate) {
                    queryParams.append('endDate', filters.endDate);
                }

                const queryString = queryParams.toString();
                if (queryString) {
                    endpoint += `?${queryString}`;
                }

                const response = await apiRequest(endpoint);

                if (!response.success || !Array.isArray(response.data)) {
                    throw new Error(response.message || 'Resposta inválida da API de logs.');
                }

                auditLogs = response.data; // Armazena os logs na variável
                tableBody.innerHTML = ''; // Limpa a tabela

                if (auditLogs.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum log de atividade encontrado.</td></tr>`;
                    return;
                }

                auditLogs.forEach(log => {
                    const row = document.createElement('tr');

                    // Formata a data para ser mais legível
                    const timestamp = new Date(log.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });

                    // Adiciona uma classe CSS com base no status para colorir
                    const statusClass = log.status === 'SUCCESS' ? 'status-success' : 'status-failure';

                    row.innerHTML = `
                        <td>${timestamp}</td>
                        <td>${log.user_email || 'N/A'}</td>
                        <td>${log.ip_address || 'N/A'}</td>
                        <td>${log.action}</td>
                        <td class="status-cell"><span class="${statusClass}">${log.status}</span></td>
                        <td>${log.description || ''}</td>
                    `;
                    tableBody.appendChild(row);
                });

            } catch (error) {
                console.error("Erro ao carregar logs de auditoria:", error);
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--color-danger);">Falha ao carregar logs. Tente novamente.</td></tr>`;
            }
        };

        const exportToCSV = () => {
            const header = ["Data/Hora", "Utilizador", "IP", "Ação", "Status", "Descrição"];
            const csv = [
                header.join(','),
                ...auditLogs.map(log => [
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
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'logs_de_auditoria.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        const exportToExcel = () => {
            const worksheet = XLSX.utils.json_to_sheet(auditLogs.map(log => ({
                "Data/Hora": new Date(log.timestamp).toLocaleString('pt-BR'),
                "Utilizador": log.user_email || 'N/A',
                "IP": log.ip_address || 'N/A',
                "Ação": log.action,
                "Status": log.status,
                "Descrição": log.description || ''
            })));
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Logs de Auditoria");
            XLSX.writeFile(workbook, "logs_de_auditoria.xlsx");
        };

        const filterLogsBtn = document.getElementById('filterLogsBtn');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        if (filterLogsBtn) {
            filterLogsBtn.addEventListener('click', () => {
                const keyword = document.getElementById('logKeyword').value;
                const startDate = document.getElementById('logStartDate').value;
                const endDate = document.getElementById('logEndDate').value;
                loadAuditLogs({ keyword, startDate, endDate });
            });
        }

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                document.getElementById('logKeyword').value = '';
                document.getElementById('logStartDate').value = '';
                document.getElementById('logEndDate').value = '';
                loadAuditLogs();
            });
        }

        document.getElementById('exportCsvBtn')?.addEventListener('click', exportToCSV);
        document.getElementById('exportExcelBtn')?.addEventListener('click', exportToExcel);

        // --- INICIALIZAÇÃO DA PÁGINA ---
        const initializeSettingsPage = async () => {
            if (!window.currentUserProfile?.role) {
                setTimeout(initializeSettingsPage, 100); // Espera o perfil carregar
                return;
            }

            const role = window.currentUserProfile.role;
            const permissions = window.currentUserProfile.permissions;
            const isMaster = (role === 'master');
            let firstVisibleTabId = 'tab-perfil';

            // [CORRIGIDO] Lógica de visibilidade da aba de Aparência
            const canSeeAppearance = isMaster || permissions['settings.appearance'] || permissions['settings.login_page'];
            const appearanceTabLink = document.querySelector('.tab-link[data-tab="tab-aparencia"]');
            if (appearanceTabLink) {
                appearanceTabLink.style.display = canSeeAppearance ? '' : 'none';
            }

            tabLinks.forEach(link => {
                const tabId = link.getAttribute('data-tab');
                let show = true;
                // [CORRIGIDO] Controla a visibilidade da aba Empresa (SMTP) pela permissão
                if (tabId === 'tab-empresa' && !isMaster && !permissions['settings.smtp']) {
                    show = false;
                }
                if (tabId === 'tab-permissoes' && !isMaster && role !== 'DPO') { show = false; }
                // A visibilidade da aba de aparência é tratada acima
                if (tabId === 'tab-aparencia') {
                    return; // Pula a lógica antiga
                }
                if (tabId === 'tab-logs' && !isMaster && role !== 'DPO') { show = false; }
                // [CORRIGIDO] Adiciona a verificação de permissão para a aba de Gestão de Dados (LGPD)
                if (tabId === 'tab-lgpd' && !permissions['lgpd.read']) {
                    show = false;
                }
                
                link.style.display = show ? '' : 'none';
                const tabContentEl = document.getElementById(tabId);
                if(tabContentEl) tabContentEl.style.display = show ? '' : 'none';
            });

            // Carrega dados das abas visíveis
            if (document.getElementById('tab-empresa')?.style.display !== 'none') {
                loadGeneralSettings();
            }
            if (document.getElementById('tab-aparencia')?.style.display !== 'none') {
                loadGeneralSettings();
            }
            if (document.getElementById('tab-permissoes')?.style.display !== 'none') {
                loadPermissionsMatrix();
            }
            if (document.getElementById('tab-logs')?.style.display !== 'none') {
                loadAuditLogs();
            }

            // [CORRIGIDO] Controla a visibilidade das seções de aparência
            const panelAppearanceSection = document.querySelector('.appearance-section');
            if (panelAppearanceSection) {
                panelAppearanceSection.style.display = (isMaster || permissions['settings.appearance']) ? '' : 'none';
            }
            const loginAppearanceSection = document.querySelector('.login-appearance-section');
            if (loginAppearanceSection) {
                loginAppearanceSection.style.display = (isMaster || permissions['settings.login_page']) ? '' : 'none';
            }

            const firstVisibleLink = Array.from(tabLinks).find(link => link.style.display !== 'none');
            if (firstVisibleLink) {
                firstVisibleTabId = firstVisibleLink.dataset.tab;
            }
            switchTab(firstVisibleTabId);
        };

        if (tabLinks.length > 0) { 
            tabLinks.forEach(link => link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(e.currentTarget.dataset.tab);
            })); 
        }
        
        // [CORRIGIDO] Adiciona o listener para o formulário de troca de senha
        if (changeOwnPasswordForm) {
            changeOwnPasswordForm.addEventListener('submit', handleChangeOwnPassword);
        }

        // [CORRIGIDO] Adiciona o listener para o botão de reset de aparência
        if (resetAppearanceBtn) {
            resetAppearanceBtn.addEventListener('click', handleResetAppearance);
        }

        // --- Lógica para os botões de remover imagem ---
        if (removeBackgroundBtn) {
            removeBackgroundBtn.addEventListener('click', () => {
                const preview = document.getElementById('currentBackgroundPreview');
                if (preview) preview.style.display = 'none';
                removeBackgroundBtn.style.display = 'none';
                if (loginBgColorInput) loginBgColorInput.disabled = false;
                if (backgroundUploadInput) backgroundUploadInput.value = ''; // Limpa o seletor de ficheiro
                if (unifiedAppearanceForm) unifiedAppearanceForm.dataset.removeBackground = 'true'; // Marca para remoção no submit
                showNotification("A imagem de fundo será removida ao guardar.", "info");
            });
        }

        if (removeLoginLogoBtn) {
            removeLoginLogoBtn.addEventListener('click', () => {
                const preview = document.getElementById('currentLoginLogoPreview');
                const uploadInput = document.getElementById('loginLogoUpload');
                if (preview) preview.style.display = 'none';
                removeLoginLogoBtn.style.display = 'none';
                if (uploadInput) uploadInput.value = ''; // Limpa o seletor de ficheiro
                if (unifiedAppearanceForm) unifiedAppearanceForm.dataset.removeLoginLogo = 'true'; // Marca para remoção no submit
                showNotification("O logo da página de login será removido ao guardar.", "info");
            });
        }


        const goToLgpdPageBtn = document.getElementById('goToLgpdPageBtn');
        if (goToLgpdPageBtn) {
            goToLgpdPageBtn.addEventListener('click', () => {
                const reauthModal = document.getElementById('reauthLgpdModal');
                const reauthEmail = document.getElementById('reauthEmail');
                // [NOVO] Adiciona o listener para o formulário de SMTP
                if (smtpSettingsForm) {
                    smtpSettingsForm.addEventListener('submit', handleSmtpSettings);
                }


                if (reauthModal && reauthEmail && window.currentUserProfile) {
                    reauthEmail.value = window.currentUserProfile.email;
                    reauthModal.classList.remove('hidden');
                }
            });
        }

        // [ADICIONADO] Listener para o formulário de aparência unificado
        if (unifiedAppearanceForm) {
            unifiedAppearanceForm.addEventListener('submit', handleUnifiedAppearance);
        }

        initializeSettingsPage();
    }; // <-- Esta chave fecha a função window.initSettingsPage