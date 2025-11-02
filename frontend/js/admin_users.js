document.addEventListener('DOMContentLoaded', () => {
    if (window.initUsersPage) {
        console.warn("Tentativa de carregar admin_users.js múltiplas vezes.");
    } else {
        window.initUsersPage = () => {
            console.log("A inicializar a página de gestão de utilizadores (V3 - com nome completo)...");

            const currentUserRole = window.currentUserProfile ? window.currentUserProfile.role : null;
            const currentUserId = window.currentUserProfile ? window.currentUserProfile.id : null;

            const addUserBtn = document.getElementById('addUserBtn');
            const tableBody = document.querySelector('#usersTable tbody');
            const userModal = document.getElementById('userModal');
            const userModalCloseBtn = userModal.querySelector('.modal-close-btn');
            const userModalCancelBtn = document.getElementById('cancelBtn');
            const userForm = document.getElementById('userForm');
            const modalTitle = document.getElementById('modalTitle');
            const passwordGroup = document.getElementById('passwordGroup');
            const sensitiveDataGroup = userModal.querySelector('.sensitive-data-group');
            const resetPasswordModal = document.getElementById('resetPasswordModal');
            const resetModalCloseBtn = resetPasswordModal.querySelector('.modal-close-btn');
            const resetModalCancelBtn = document.getElementById('cancelResetBtn');
            const resetPasswordForm = document.getElementById('resetPasswordForm');
            const resetUserEmailSpan = document.getElementById('resetUserEmail');

            const setupPageByRole = () => {
                if (!currentUserRole) {
                    console.error("Não foi possível determinar a função do utilizador.");
                    return;
                }
                if (currentUserRole === 'master') {
                    addUserBtn.style.display = 'block';
                }
                if (currentUserRole === 'master' || currentUserRole === 'DPO') {
                    document.querySelectorAll('.sensitive-data').forEach(el => {
                        el.style.display = 'table-cell';
                    });
                }
            };

            const loadUsers = async () => {
                tableBody.innerHTML = `<tr><td colspan="9">A carregar...</td></tr>`;
                try {
                    const users = await apiRequest('/api/admin/users');
                    tableBody.innerHTML = '';
                    if (users.data.length === 0) {
                        tableBody.innerHTML = `<tr><td colspan="9">Nenhum utilizador encontrado.</td></tr>`;
                        return;
                    }
                    const showSensitiveData = (currentUserRole === 'master' || currentUserRole === 'DPO');
                    users.data.forEach(user => {
                        const row = document.createElement('tr');
                        let cells = `
                            <td>${user.id}</td>
                            <td>${user.nome_completo || 'N/A'}</td>
                            <td>${user.email}</td>
                            <td><span class="badge role-${user.role}">${user.role}</span></td>
                        `;
                        if (showSensitiveData) {
                            cells += `
                                <td>${user.setor || 'N/A'}</td>
                                <td>${user.matricula || 'N/A'}</td>
                                <td>${user.cpf || 'N/A'}</td>
                            `;
                        }
                        cells += `
                            <td><span class="badge status-${user.is_active ? 'active' : 'inactive'}">${user.is_active ? 'Ativo' : 'Inativo'}</span></td>
                            <td class="action-buttons">
                                ${generateActionButtons(user)}
                            </td>
                        `;
                        row.innerHTML = cells;
                        tableBody.appendChild(row);
                    });
                    attachActionListeners();
                } catch (error) {
                    tableBody.innerHTML = `<tr><td colspan="9">Erro ao carregar utilizadores.</td></tr>`;
                    console.error("Erro ao carregar utilizadores:", error);
                }
            };

            const generateActionButtons = (user) => {
                let buttons = '';
                const userId = user.id;
                const isSelf = (user.id === currentUserId);
                const isMasterUser = (user.id === 1);
                if (currentUserRole === 'master') {
                    buttons += `<button class="btn-edit" data-user-id="${userId}">Editar</button>`;
                    if (!isMasterUser) {
                        buttons += `<button class="btn-delete" data-user-id="${userId}">Eliminar</button>`;
                        buttons += `<button class="btn-secondary" data-user-id="${userId}" data-user-email="${user.email}">Resetar Senha</button>`;
                    }
                } else if (currentUserRole === 'gestao') {
                    if (!isMasterUser) {
                        buttons += `<button class="btn-edit" data-user-id="${userId}">Editar</button>`;
                        if (!isSelf) {
                           buttons += `<button class="btn-secondary" data-user-id="${userId}" data-user-email="${user.email}">Resetar Senha</button>`;
                        }
                    }
                }
                return buttons;
            };
            
            const attachActionListeners = () => {
                tableBody.querySelectorAll('.btn-edit').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userId = e.target.getAttribute('data-user-id');
                        openModalForEdit(userId);
                    });
                });
                tableBody.querySelectorAll('.btn-delete').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userId = e.target.getAttribute('data-user-id');
                        handleDelete(userId);
                    });
                });
                tableBody.querySelectorAll('.btn-secondary').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const userId = e.target.getAttribute('data-user-id');
                        const userEmail = e.target.getAttribute('data-user-email');
                        openResetPasswordModal(userId, userEmail);
                    });
                });
            };

            const handleFormSubmit = async (event) => {
                event.preventDefault();
                const userId = document.getElementById('userId').value;
                
                let userData = {
                    nome_completo: document.getElementById('userFullName').value,
                    email: document.getElementById('userEmail').value,
                    role: document.getElementById('userRoleSelect').value,
                    is_active: document.getElementById('userIsActive').checked,
                };

                if (currentUserRole === 'master') {
                    userData.setor = document.getElementById('userSetor').value;
                    userData.matricula = document.getElementById('userMatricula').value;
                    userData.cpf = document.getElementById('userCpf').value;
                }

                const password = document.getElementById('userPassword').value;
                if (!userId || password) {
                    if (password && password.length < 6) {
                         showNotification("A senha deve ter pelo menos 6 caracteres.", 'warning');
                         return;
                    }
                    userData.password = password;
                }

                const method = userId ? 'PUT' : 'POST';
                const endpoint = userId ? `/api/admin/users/${userId}` : '/api/admin/users';

                try {
                    const result = await apiRequest(endpoint, method, userData);
                    showNotification(result.message, 'success');
                    closeModal(userModal);
                    loadUsers(); // Recarrega a lista após sucesso
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            };

            const handleDelete = async (userId) => {
                const confirmed = await showConfirmationModal(`Tem a certeza de que deseja eliminar o utilizador com ID ${userId}?`);
                if (confirmed) {
                    try {
                        const result = await apiRequest(`/api/admin/users/${userId}`, 'DELETE');
                        showNotification(result.message, 'success');
                        loadUsers();
                    } catch (error) {
                        showNotification(`Erro: ${error.message}`, 'error');
                    }
                }
            };

            const openModalForCreate = () => {
                userForm.reset();
                document.getElementById('userId').value = '';
                modalTitle.textContent = 'Adicionar Novo Utilizador';
                document.getElementById('userPassword').required = true;
                passwordGroup.style.display = 'block';
                sensitiveDataGroup.style.display = 'block'; 
                const roleSelect = document.getElementById('userRoleSelect');
                roleSelect.querySelector('option[value="master"]').disabled = (currentUserRole !== 'master');
                userModal.classList.remove('hidden');
            };

            const openModalForEdit = async (userId) => {
                try {
                     const users = await apiRequest('/api/admin/users');
                     const user = users.data.find(u => u.id == userId);
                     if (!user) {
                        showNotification("Erro: Utilizador não encontrado.", 'error');
                        return;
                     }

                    userForm.reset();
                    document.getElementById('userId').value = user.id;
                    document.getElementById('userFullName').value = user.nome_completo || '';
                    document.getElementById('userEmail').value = user.email;
                    document.getElementById('userRoleSelect').value = user.role;
                    document.getElementById('userIsActive').checked = user.is_active;
                    
                    modalTitle.textContent = 'Editar Utilizador';
                    
                    document.getElementById('userPassword').required = false;
                    passwordGroup.style.display = 'none'; 
                    
                    const roleSelect = document.getElementById('userRoleSelect');
                    roleSelect.querySelector('option[value="master"]').style.display = (currentUserRole === 'master') ? 'block' : 'none';
                    roleSelect.disabled = (currentUserRole === 'gestao' && user.role === 'master');

                    if (currentUserRole === 'master') {
                        document.getElementById('userSetor').value = user.setor || '';
                        document.getElementById('userMatricula').value = user.matricula || '';
                        document.getElementById('userCpf').value = user.cpf || '';
                        sensitiveDataGroup.style.display = 'block';
                    } else {
                        sensitiveDataGroup.style.display = 'none';
                    }

                    userModal.classList.remove('hidden');
                    
                } catch (error) {
                    showNotification(`Erro ao buscar dados do utilizador: ${error.message}`, 'error');
                }
            };

            const closeModal = (modalElement) => {
                modalElement.classList.add('hidden');
            };
            
            const openResetPasswordModal = (userId, userEmail) => {
                resetPasswordForm.reset();
                document.getElementById('resetUserId').value = userId;
                resetUserEmailSpan.textContent = userEmail;
                resetPasswordModal.classList.remove('hidden');
            };
            
            const handleResetPasswordSubmit = async (event) => {
                event.preventDefault();
                const userId = document.getElementById('resetUserId').value;
                const newPassword = document.getElementById('newPassword').value;
                
                if (newPassword.length < 6) {
                    showNotification("A nova senha deve ter pelo menos 6 caracteres.", 'warning');
                    return;
                }
                
                try {
                    const result = await apiRequest(`/api/admin/users/${userId}/reset-password`, 'POST', { newPassword });
                    showNotification(result.message, 'success');
                    closeModal(resetPasswordModal);
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            };

            addUserBtn.addEventListener('click', openModalForCreate);
            userModalCloseBtn.addEventListener('click', () => closeModal(userModal));
            userModalCancelBtn.addEventListener('click', () => closeModal(userModal));
            userForm.addEventListener('submit', handleFormSubmit);
            
            resetModalCloseBtn.addEventListener('click', () => closeModal(resetPasswordModal));
            resetModalCancelBtn.addEventListener('click', () => closeModal(resetPasswordModal));
            resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
            
            setupPageByRole();
            loadUsers();
        };
    }
});