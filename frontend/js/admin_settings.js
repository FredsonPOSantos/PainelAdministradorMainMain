// Ficheiro: frontend/js/admin_settings.js
// [VERSÃO 14.0 - REFEITO O LAYOUT DE PERMISSÕES]

if (window.initSettingsPage) {
    console.warn("Tentativa de carregar admin_settings.js múltiplas vezes.");
} else {
    let isInitializingSettings = false;
    let originalPermissionsState = {};

    window.initSettingsPage = () => {
        if (isInitializingSettings) { return; }
        isInitializingSettings = true;
        console.log("A inicializar a página de Configurações (V14.0)...");

        // --- Elementos ---
        const tabNav = document.querySelector('.tab-nav');
        const tabLinks = document.querySelectorAll('.tab-nav .tab-link');
        const tabContents = document.querySelectorAll('.tab-content-container .tab-content');
        const changeOwnPasswordForm = document.getElementById('changeOwnPasswordForm');
        const companySettingsForm = document.getElementById('companySettingsForm');
        const appearanceSettingsForm = document.getElementById('appearanceSettingsForm');
        const loginAppearanceSettingsForm = document.getElementById('loginAppearanceSettingsForm');
        const hotspotSettingsForm = document.getElementById('hotspotSettingsForm');
        const backgroundSettingsForm = document.getElementById('backgroundSettingsForm');
        const loginLogoSettingsForm = document.getElementById('loginLogoSettingsForm');
        
        // --- Elementos da Aba de Permissões (NOVO LAYOUT) ---
        const permissionsGridContainer = document.getElementById('permissionsGridContainer');
        const permissionsError = document.getElementById('permissionsError');
        const permHelpTextMaster = document.getElementById('permHelpTextMaster');
        const permHelpTextDPO = document.getElementById('permHelpTextDPO');
        const permSaveChangesContainer = document.getElementById('permSaveChangesContainer');
        const permSaveChangesBtn = document.getElementById('permSaveChangesBtn');
        const permSaveStatus = document.getElementById('permSaveStatus');

        // --- Lógica de Abas (estável) ---
        const switchTab = (targetTabId) => {
            if (!targetTabId) return;
            tabContents.forEach(c => c.classList.remove('active'));
            tabLinks.forEach(l => l.classList.remove('active'));
            const targetContent = document.getElementById(targetTabId);
            const targetLink = tabNav.querySelector(`.tab-link[data-tab="${targetTabId}"]`);
            if (targetContent) targetContent.classList.add('active');
            if (targetLink) targetLink.classList.add('active');
        };

        // --- Lógica Formulários (estável, omitida para brevidade) ---
        if (changeOwnPasswordForm) { /* ... listener ... */ }
        if (companySettingsForm) {
            companySettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const successMsg = document.getElementById('companySettingsSuccess');
                const errorMsg = document.getElementById('companySettingsError');
                const submitButton = companySettingsForm.querySelector('button[type="submit"]');

                successMsg.textContent = '';
                errorMsg.textContent = '';
                submitButton.disabled = true;
                submitButton.textContent = 'A guardar...';

                const formData = new FormData();
                formData.append('company_name', document.getElementById('companyName').value);
                
                const logoFile = document.getElementById('logoUpload').files[0];
                if (logoFile) {
                    formData.append('companyLogo', logoFile);
                }

                try {
                    const response = await apiRequest('/api/settings/general', 'POST', formData);

                    if (response && response.settings) {
                        window.systemSettings = response.settings;
                        
                        if (window.applyVisualSettings) {
                            window.applyVisualSettings(response.settings);
                        }
                        
                        successMsg.textContent = response.message || 'Configurações guardadas com sucesso!';
                    } else {
                        throw new Error('A API não retornou as novas configurações.');
                    }

                } catch (error) {
                    errorMsg.textContent = `Erro ao guardar configurações: ${error.message}`;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Configurações da Empresa';
                }
            });
        }
        if (appearanceSettingsForm) {
            appearanceSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const successMsg = document.getElementById('appearanceSettingsSuccess');
                const errorMsg = document.getElementById('appearanceSettingsError');
                const submitButton = appearanceSettingsForm.querySelector('button[type="submit"]');

                successMsg.textContent = '';
                errorMsg.textContent = '';
                submitButton.disabled = true;
                submitButton.textContent = 'A guardar...';

                const formData = new FormData();
                formData.append('primary_color', document.getElementById('primaryColor').value);
                formData.append('background_color', document.getElementById('backgroundColor').value);
                formData.append('sidebar_color', document.getElementById('sidebarColor').value);
                formData.append('font_color', document.getElementById('fontColor').value);
                formData.append('font_family', document.getElementById('fontFamily').value);
                formData.append('font_size', document.getElementById('fontSize').value);
                formData.append('modal_background_color', document.getElementById('modalBackgroundColor').value);
                formData.append('modal_font_color', document.getElementById('modalFontColor').value);
                formData.append('modal_border_color', document.getElementById('modalBorderColor').value);

                try {
                    const response = await apiRequest('/api/settings/general', 'POST', formData);

                    if (response && response.settings) {
                        window.systemSettings = response.settings;
                        
                        if (window.applyVisualSettings) {
                            window.applyVisualSettings(response.settings);
                        }
                        
                        successMsg.textContent = response.message || 'Configurações guardadas com sucesso!';
                    } else {
                        throw new Error('A API não retornou as novas configurações.');
                    }

                } catch (error) {
                    errorMsg.textContent = `Erro ao guardar configurações: ${error.message}`;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Alterações de Aparência';
                }
            });
        }

        if (loginAppearanceSettingsForm) {
            loginAppearanceSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const successMsg = document.getElementById('loginAppearanceSettingsSuccess');
                const errorMsg = document.getElementById('loginAppearanceSettingsError');
                const submitButton = loginAppearanceSettingsForm.querySelector('button[type="submit"]');

                successMsg.textContent = '';
                errorMsg.textContent = '';
                submitButton.disabled = true;
                submitButton.textContent = 'A guardar...';

                const data = {
                    login_background_color: document.getElementById('loginBackgroundColor').value,
                    login_form_background_color: document.getElementById('loginFormBackgroundColor').value,
                    login_font_color: document.getElementById('loginFontColor').value,
                    login_button_color: document.getElementById('loginButtonColor').value
                };

                try {
                    const response = await apiRequest('/api/settings/login-appearance', 'POST', data);

                    if (response && response.settings) {
                        window.systemSettings = response.settings;
                        
                        successMsg.textContent = response.message || 'Configurações guardadas com sucesso!';
                    } else {
                        throw new Error('A API não retornou as novas configurações.');
                    }

                } catch (error) {
                    errorMsg.textContent = `Erro ao guardar configurações: ${error.message}`;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Cores do Login';
                }
            });
        }
        if (hotspotSettingsForm) { /* ... listener ... */ }
        if (backgroundSettingsForm) {
            backgroundSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const successMsg = document.getElementById('backgroundSettingsSuccess');
                const errorMsg = document.getElementById('backgroundSettingsError');
                const submitButton = backgroundSettingsForm.querySelector('button[type="submit"]');

                successMsg.textContent = '';
                errorMsg.textContent = '';
                submitButton.disabled = true;
                submitButton.textContent = 'A guardar...';

                const formData = new FormData();
                const backgroundImageFile = document.getElementById('backgroundUpload').files[0];
                if (backgroundImageFile) {
                    formData.append('backgroundImage', backgroundImageFile);
                }

                try {
                    const response = await apiRequest('/api/settings/background', 'POST', formData);
                    if (response && response.settings) {
                        window.systemSettings = response.settings;
                        successMsg.textContent = response.message || 'Imagem de fundo guardada com sucesso!';
                        loadGeneralSettings(); // Recarrega as configurações para mostrar a nova imagem
                    } else {
                        throw new Error('A API não retornou as novas configurações.');
                    }
                } catch (error) {
                    errorMsg.textContent = `Erro ao guardar imagem de fundo: ${error.message}`;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Imagem de Fundo';
                }
            });
        }

        if (loginLogoSettingsForm) {
            loginLogoSettingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const successMsg = document.getElementById('loginLogoSettingsSuccess');
                const errorMsg = document.getElementById('loginLogoSettingsError');
                const submitButton = loginLogoSettingsForm.querySelector('button[type="submit"]');

                successMsg.textContent = '';
                errorMsg.textContent = '';
                submitButton.disabled = true;
                submitButton.textContent = 'A guardar...';

                const formData = new FormData();
                const loginLogoFile = document.getElementById('loginLogoUpload').files[0];
                if (loginLogoFile) {
                    formData.append('loginLogo', loginLogoFile);
                } else {
                    errorMsg.textContent = 'Nenhum ficheiro selecionado.';
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Logo do Login';
                    return;
                }

                try {
                    const response = await apiRequest('/api/settings/login-logo', 'POST', formData);
                    if (response && response.settings) {
                        window.systemSettings = response.settings;
                        successMsg.textContent = response.message || 'Logo guardado com sucesso!';
                        loadGeneralSettings(); // Recarrega as configurações para mostrar a nova imagem
                    } else {
                        throw new Error('A API não retornou as novas configurações.');
                    }
                } catch (error) {
                    errorMsg.textContent = `Erro ao guardar o logo: ${error.message}`;
                } finally {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Guardar Logo do Login';
                }
            });
        }

        const loadGeneralSettings = async () => {
            try {
                const settings = await apiRequest('/api/settings/general');
                if (settings) {
                    document.getElementById('companyName').value = settings.company_name || '';
                    document.getElementById('primaryColor').value = settings.primary_color || '#4299e1';
                    document.getElementById('backgroundColor').value = settings.background_color || '#1a202c';
                    document.getElementById('sidebarColor').value = settings.sidebar_color || '#2d3748';
                    document.getElementById('fontColor').value = settings.font_color || '#edf2f7';
                    document.getElementById('fontFamily').value = settings.font_family || '\'Inter\', sans-serif';
                    document.getElementById('fontSize').value = settings.font_size || '16';
                    document.getElementById('modalBackgroundColor').value = settings.modal_background_color || '#2d3748';
                    document.getElementById('modalFontColor').value = settings.modal_font_color || '#edf2f7';
                    document.getElementById('modalBorderColor').value = settings.modal_border_color || '#4a5568';
                    document.getElementById('loginBackgroundColor').value = settings.login_background_color || '#1a202c';
                    document.getElementById('loginFormBackgroundColor').value = settings.login_form_background_color || '#2d3748';
                    document.getElementById('loginFontColor').value = settings.login_font_color || '#edf2f7';
                    document.getElementById('loginButtonColor').value = settings.login_button_color || '#062f51';
                    const logoPreview = document.getElementById('currentLogoPreview');
                    if (settings.logo_url) {
                        logoPreview.src = `http://${window.location.hostname}:3000${settings.logo_url}`;
                        logoPreview.style.display = 'block';
                    } else {
                        logoPreview.style.display = 'none';
                    }
                    const backgroundPreview = document.getElementById('currentBackgroundPreview');
                    if (settings.background_image_url) {
                        backgroundPreview.src = `http://${window.location.hostname}:3000${settings.background_image_url}`;
                        backgroundPreview.style.display = 'block';
                    } else {
                        backgroundPreview.style.display = 'none';
                    }

                    const loginLogoPreview = document.getElementById('currentLoginLogoPreview');
                    if (settings.login_logo_url) {
                        loginLogoPreview.src = `http://${window.location.hostname}:3000${settings.login_logo_url}`;
                        loginLogoPreview.style.display = 'block';
                    } else {
                        loginLogoPreview.style.display = 'none';
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar configurações gerais:', error);
            }
        };

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
                const matrixData = await apiRequest('/api/permissions/matrix');
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

            tabLinks.forEach(link => {
                const tabId = link.getAttribute('data-tab');
                let show = true;
                if (link.classList.contains('master-only') && !isMaster) { show = false; }
                if (tabId === 'tab-permissoes' && !isMaster && role !== 'DPO') { show = false; }
                if (tabId === 'tab-empresa' && !isMaster && !permissions['settings.general.read']) { show = false; }
                if (tabId === 'tab-aparencia' && !isMaster && !permissions['settings.general.read']) { show = false; }
                
                link.style.display = show ? '' : 'none';
                document.getElementById(tabId).style.display = show ? '' : 'none';
            });

            // Carrega dados das abas visíveis
            if (document.getElementById('tab-empresa').style.display !== 'none') {
                loadGeneralSettings();
            }
            if (document.getElementById('tab-aparencia').style.display !== 'none') {
                loadGeneralSettings();
            }
            if (document.getElementById('tab-permissoes').style.display !== 'none') {
                loadPermissionsMatrix();
            }

            // Controla a visibilidade das configurações de aparência
            const appearanceSettings = document.querySelectorAll('.appearance-setting');
            const canChangeAppearance = isMaster || window.currentUserProfile?.permissions['settings.appearance'] === true;
            appearanceSettings.forEach(el => {
                el.style.display = canChangeAppearance ? '' : 'none';
            });

            // Controla a visibilidade das configurações de aparência da página de login
            const loginAppearanceSettings = document.querySelectorAll('.login-appearance-setting');
            const canChangeLoginAppearance = isMaster || window.currentUserProfile?.permissions['settings.login_page'] === true;
            loginAppearanceSettings.forEach(el => {
                el.style.display = canChangeLoginAppearance ? '' : 'none';
            });

            switchTab(firstVisibleTabId);
        };

        if (tabLinks.length > 0) { tabLinks.forEach(link => link.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab))); }
        initializeSettingsPage();
    };
}