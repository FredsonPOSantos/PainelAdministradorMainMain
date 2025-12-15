// Adiciona uma "guarda" para prevenir que o script seja executado mais de uma vez.
if (window.initTemplatesPage) {
    console.warn("Tentativa de carregar admin_templates.js múltiplas vezes. A segunda execução foi ignorada.");
} else {

    /**
     * Define a função no objeto global 'window' para que a guarda funcione
     * e a função seja acessível por outros scripts.
     */
    window.initTemplatesPage = () => {
        console.log("A inicializar a página de gestão de templates...");

        // --- ELEMENTOS DO DOM ---
        // A lógica daqui para baixo permanece idêntica à sua versão original.
        const addTemplateBtn = document.getElementById('addTemplateBtn');
        const modal = document.getElementById('templateModal');
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = document.getElementById('cancelBtn');
        const templateForm = document.getElementById('templateForm');
        const modalTitle = document.getElementById('modalTitle');
        const videoUrlGroup = document.getElementById('videoUrlGroup');
        const baseModelSelect = document.getElementById('templateBaseModel');
        const preLoginBannerSelect = document.getElementById('templateBanner');
        const postLoginBannerSelect = document.getElementById('templatePostLoginBanner'); // [NOVO]
        const tableBody = document.querySelector('#templatesTable tbody');

        // [NOVO] Elementos para upload de ficheiros
        const logoSourceUpload = document.getElementById('logoSourceUpload');
        const logoSourceUrl = document.getElementById('logoSourceUrl');
        const logoUploadGroup = document.getElementById('logoUploadGroup');
        const logoUrlGroup = document.getElementById('logoUrlGroup');
        const logoFileInput = document.getElementById('templateLogoFile');

        const bgSourceUpload = document.getElementById('bgSourceUpload');
        const bgSourceUrl = document.getElementById('bgSourceUrl');
        const bgUploadGroup = document.getElementById('bgUploadGroup');
        const bgUrlGroup = document.getElementById('bgUrlGroup');
        const bgFileInput = document.getElementById('templateBgFile');

        // [NOVO] Elementos para a secção de Status
        const statusLogoSourceUpload = document.getElementById('statusLogoSourceUpload');
        const statusLogoSourceUrl = document.getElementById('statusLogoSourceUrl');
        const statusLogoUploadGroup = document.getElementById('statusLogoUploadGroup');
        const statusLogoUrlGroup = document.getElementById('statusLogoUrlGroup');
        const statusLogoFileInput = document.getElementById('templateStatusLogoFile');
        const statusBgSourceColor = document.getElementById('statusBgSourceColor');
        const statusBgSourceImage = document.getElementById('statusBgSourceImage');
        const statusBgColorGroup = document.getElementById('statusBgColorGroup');
        const statusBgImageGroup = document.getElementById('statusBgImageGroup');
        const statusBgFileInput = document.getElementById('templateStatusBgFile');
        const statusBgUrlInput = document.getElementById('templateStatusBgUrl');



        // --- FUNÇÕES INTERNAS DA PÁGINA (ENCAPSULADAS) ---

        const loadTemplates = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">A carregar...</td></tr>';
            try {
                const templates = await apiRequest('/api/templates');
                tableBody.innerHTML = '';
                if (templates.length === 0) { // [CORRIGIDO] A API retorna o array diretamente
                    tableBody.innerHTML = '<tr><td colspan="5">Nenhum template encontrado.</td></tr>';
                    return;
                }
                templates.forEach(template => { // [CORRIGIDO] A API retorna o array diretamente
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${template.id}</td>
                        <td>${template.name}</td>
                        <td>${template.base_model}</td>
                        <td>${template.login_type}</td>
                        <td class="action-buttons">
                            <button class="btn-edit">Editar</button>
                            <button class="btn-delete">Eliminar</button>
                        </td>
                    `;
                    row.querySelector('.btn-edit').addEventListener('click', () => openModalForEdit(template));
                    row.querySelector('.btn-delete').addEventListener('click', () => handleDelete(template.id, template.name));
                    tableBody.appendChild(row);
                });
            } catch (error) {
                tableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar templates.</td></tr>`;
                console.error("Erro ao carregar templates:", error);
            }
        };

        const handleFormSubmit = async (event) => {
            event.preventDefault();
            const templateId = document.getElementById('templateId').value;

            // [NOVO] Usa FormData para enviar ficheiros e texto
            const formData = new FormData();
            formData.append('name', document.getElementById('templateName').value);
            formData.append('base_model', document.getElementById('templateBaseModel').value);
            formData.append('login_type', document.getElementById('templateLoginType').value);
            formData.append('primary_color', document.getElementById('templatePrimaryColor').value);
            formData.append('font_color', document.getElementById('templateFontColor').value);
            formData.append('font_size', document.getElementById('templateFontSize').value || '');
            formData.append('promo_video_url', document.getElementById('templateVideoUrl').value || '');
            formData.append('form_background_color', document.getElementById('templateFormBgColor').value); // [NOVO]
            formData.append('font_family', document.getElementById('templateFontFamily').value); // [NOVO]
            formData.append('prelogin_banner_id', preLoginBannerSelect.value || '');
            formData.append('postlogin_banner_id', postLoginBannerSelect.value || ''); // [NOVO]
            formData.append('status_title', document.getElementById('templateStatusTitle').value || ''); // [NOVO]
            formData.append('status_message', document.getElementById('templateStatusMessage').value || ''); // [NOVO]
            // [NOVO] Campos de personalização da tela de status
            formData.append('status_bg_color', document.getElementById('templateStatusBgColor').value || '');
            formData.append('status_h1_font_size', document.getElementById('templateStatusH1FontSize').value || '');
            formData.append('status_p_font_size', document.getElementById('templateStatusPFontSize').value || '');



            // Lógica para logótipo
            if (logoSourceUpload.checked && logoFileInput.files[0]) {
                formData.append('logoFile', logoFileInput.files[0]);
            } else if (document.getElementById('templateLogoUrl').value) {
            } else {
                formData.append('logoUrl', document.getElementById('templateLogoUrl').value || '');
            }

            // Lógica para imagem de fundo
            if (bgSourceUpload.checked && bgFileInput.files[0]) {
                formData.append('backgroundFile', bgFileInput.files[0]);
            } else if (document.getElementById('templateBgUrl').value) {
            } else {
                formData.append('login_background_url', document.getElementById('templateBgUrl').value || '');
            }

            // [NOVO] Lógica para logótipo da página de status
            if (statusLogoSourceUpload.checked && statusLogoFileInput.files[0]) {
                formData.append('statusLogoFile', statusLogoFileInput.files[0]);
            } else if (document.getElementById('templateStatusLogoUrl').value) {
            } else {
                formData.append('status_logo_url', document.getElementById('templateStatusLogoUrl').value || '');
            }

            // [NOVO] Lógica para fundo da página de status
            if (statusBgSourceImage.checked && statusBgFileInput.files[0]) {
                formData.append('statusBgFile', statusBgFileInput.files[0]);
            } else if (statusBgSourceImage.checked) {
                formData.append('status_bg_image_url', statusBgUrlInput.value || '');
            }

            let method = templateId ? 'PUT' : 'POST';
            let endpoint = templateId ? `/api/templates/${templateId}` : '/api/templates';

            // [CORRIGIDO] Se for uma atualização (PUT) com FormData,
            // enviamos como POST e adicionamos o campo _method para o backend interpretar como PUT.
            if (method === 'PUT') {
                formData.append('_method', 'PUT');
                method = 'POST'; // A requisição HTTP real será um POST.
            }

            try {
                const result = await apiRequest(endpoint, method, formData);
                showNotification(result.message, 'success');
                closeModal();
                loadTemplates();
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            }
        };

        const handleDelete = async (templateId, templateName) => {
            const confirmed = await showConfirmationModal(`Tem a certeza de que deseja eliminar o template "${templateName}" (ID: ${templateId})?`);
            if (confirmed) {
                try {
                    const result = await apiRequest(`/api/templates/${templateId}`, 'DELETE');
                    showNotification(result.message, 'success');
                    loadTemplates();
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            }
        };

        const loadBannersIntoSelect = async () => {
            try {
                const response = await apiRequest('/api/banners');
                if (!response.success) {
                    console.error("Erro ao carregar banners: ", response.message);
                    return;
                }
                const banners = response; // [CORRIGIDO] A API retorna o array diretamente
                // Limpa ambos os selects
                preLoginBannerSelect.innerHTML = '<option value="">Nenhum</option>';
                postLoginBannerSelect.innerHTML = '<option value="">Nenhum</option>';

                banners.forEach(banner => {
                    if (banner.is_active) {
                        const option = document.createElement('option');
                        option.value = banner.id;
                        option.textContent = `${banner.name} (ID: ${banner.id})`;

                        if (banner.type === 'pre-login') {
                            preLoginBannerSelect.appendChild(option.cloneNode(true));
                        } else if (banner.type === 'post-login') {
                            postLoginBannerSelect.appendChild(option.cloneNode(true));
                        }
                    }
                });
            } catch (error) {
                console.error("Erro ao carregar banners:", error);
            }
        };

        const openModalForCreate = () => {
            templateForm.reset();
            document.getElementById('templateId').value = '';
            modalTitle.textContent = 'Adicionar Novo Template';
            videoUrlGroup.style.display = 'none';
            document.getElementById('templateVideoUrl').required = false;
            // [NOVO] Garante que o modo de upload esteja selecionado ao criar
            logoSourceUpload.checked = true;
            bgSourceUpload.checked = true;
            toggleSourceInputs();
            // [NOVO] Reseta os campos de status
            statusLogoSourceUpload.checked = true;
            toggleStatusLogoSourceInputs();
            // [NOVO] Reseta os campos de fundo de status
            statusBgSourceColor.checked = true;
            toggleStatusBgSourceInputs();
            loadBannersIntoSelect();
            modal.classList.remove('hidden');
        };

        const openModalForEdit = (template) => {
            templateForm.reset();
            document.getElementById('templateId').value = template.id;
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateBaseModel').value = template.base_model;
            document.getElementById('templateLoginType').value = template.login_type;
            document.getElementById('templatePrimaryColor').value = template.primary_color || '#3182ce';
            document.getElementById('templateFontColor').value = template.font_color || '#2d3748';
            document.getElementById('templateFontSize').value = template.font_size || '';
            document.getElementById('templateFormBgColor').value = template.form_background_color || '#ffffff'; // [NOVO]
            document.getElementById('templateFontFamily').value = template.font_family || "'Inter', sans-serif"; // [NOVO]
            document.getElementById('templateLogoUrl').value = template.logo_url || '';
            document.getElementById('templateBgUrl').value = template.login_background_url || '';
            document.getElementById('templateVideoUrl').value = template.promo_video_url || '';
            // [NOVO] Preenche os campos de status
            document.getElementById('templateStatusTitle').value = template.status_title || '';
            document.getElementById('templateStatusMessage').value = template.status_message || '';
            document.getElementById('templateStatusLogoUrl').value = template.status_logo_url || '';
            // [NOVO] Preenche os campos de personalização de status
            document.getElementById('templateStatusBgColor').value = template.status_bg_color || '#f0f2f5';
            statusBgUrlInput.value = template.status_bg_image_url || '';
            document.getElementById('templateStatusH1FontSize').value = template.status_h1_font_size || '';
            document.getElementById('templateStatusPFontSize').value = template.status_p_font_size || '';


            videoUrlGroup.style.display = template.base_model === 'V2' ? 'block' : 'none';
            document.getElementById('templateVideoUrl').required = template.base_model === 'V2';

            // [NOVO] Ao editar, assume que as URLs existentes são do tipo URL
            logoSourceUrl.checked = true;
            bgSourceUrl.checked = true;
            statusLogoSourceUrl.checked = true; // [NOVO]
            toggleStatusLogoSourceInputs(); // [CORRIGIDO] Chama a função correta
            // [NOVO] Define o seletor de fundo com base nos dados
            statusBgSourceImage.checked = !!template.status_bg_image_url;
            statusBgSourceColor.checked = !template.status_bg_image_url;
            toggleStatusBgSourceInputs();
            toggleSourceInputs();

            loadBannersIntoSelect().then(() => {
                preLoginBannerSelect.value = template.prelogin_banner_id || '';
                postLoginBannerSelect.value = template.postlogin_banner_id || ''; // [NOVO]
            });
            modalTitle.textContent = 'Editar Template';
            modal.classList.remove('hidden');
        };

        const closeModal = () => modal.classList.add('hidden');

        // [NOVO] Função para alternar entre upload e URL
        const toggleSourceInputs = () => {
            // Lógica para o logótipo
            logoUploadGroup.classList.toggle('hidden', !logoSourceUpload.checked);
            logoUrlGroup.classList.toggle('hidden', logoSourceUpload.checked);
            logoFileInput.required = logoSourceUpload.checked;
            document.getElementById('templateLogoUrl').required = !logoSourceUpload.checked;

            // Lógica para a imagem de fundo
            bgUploadGroup.classList.toggle('hidden', !bgSourceUpload.checked);
            bgUrlGroup.classList.toggle('hidden', bgSourceUpload.checked);
            bgFileInput.required = bgSourceUpload.checked;
            document.getElementById('templateBgUrl').required = !bgSourceUpload.checked;
        };

        // [NOVO] Função para alternar o input do logo de status
        const toggleStatusLogoSourceInputs = () => {
            statusLogoUploadGroup.classList.toggle('hidden', !statusLogoSourceUpload.checked);
            statusLogoUrlGroup.classList.toggle('hidden', statusLogoSourceUpload.checked);
            statusLogoFileInput.required = statusLogoSourceUpload.checked;
            document.getElementById('templateStatusLogoUrl').required = !statusLogoSourceUpload.checked;
        };

        // [NOVO] Função para alternar o input do fundo de status
        const toggleStatusBgSourceInputs = () => {
            statusBgColorGroup.classList.toggle('hidden', !statusBgSourceColor.checked);
            statusBgImageGroup.classList.toggle('hidden', statusBgSourceColor.checked);
        };


        // --- EVENT LISTENERS ---
        baseModelSelect.addEventListener('change', () => {
            videoUrlGroup.style.display = baseModelSelect.value === 'V2' ? 'block' : 'none';
        });
        addTemplateBtn.addEventListener('click', openModalForCreate);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        templateForm.addEventListener('submit', handleFormSubmit);

        // [NOVO] Listeners para os seletores de fonte (logo e fundo)
        logoSourceUpload.addEventListener('change', toggleSourceInputs);
        logoSourceUrl.addEventListener('change', toggleSourceInputs);
        bgSourceUpload.addEventListener('change', toggleSourceInputs);
        bgSourceUrl.addEventListener('change', toggleSourceInputs);
        // [NOVO] Listeners para o logo de status
        statusLogoSourceUpload.addEventListener('change', toggleStatusLogoSourceInputs);
        statusLogoSourceUrl.addEventListener('change', toggleStatusLogoSourceInputs);
        // [NOVO] Listeners para o fundo de status
        statusBgSourceColor.addEventListener('change', toggleStatusBgSourceInputs);
        statusBgSourceImage.addEventListener('change', toggleStatusBgSourceInputs);


        // --- INICIALIZAÇÃO DA PÁGINA ---
        loadTemplates();
    };
}
