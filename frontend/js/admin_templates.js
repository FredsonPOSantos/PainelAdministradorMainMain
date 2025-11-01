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
        const bannerSelect = document.getElementById('templateBanner');
        const tableBody = document.querySelector('#templatesTable tbody');

        // --- FUNÇÕES INTERNAS DA PÁGINA (ENCAPSULADAS) ---

        const loadTemplates = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">A carregar...</td></tr>';
            try {
                const templates = await apiRequest('/api/templates');
                tableBody.innerHTML = '';
                if (templates.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">Nenhum template encontrado.</td></tr>';
                    return;
                }
                templates.forEach(template => {
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
            const templateData = {
                name: document.getElementById('templateName').value,
                base_model: document.getElementById('templateBaseModel').value,
                login_type: document.getElementById('templateLoginType').value,
                primary_color: document.getElementById('templatePrimaryColor').value,
                font_color: document.getElementById('templateFontColor').value,
                font_size: document.getElementById('templateFontSize').value || null,
                logo_url: document.getElementById('templateLogoUrl').value || null,
                login_background_url: document.getElementById('templateBgUrl').value || null,
                promo_video_url: document.getElementById('templateVideoUrl').value || null,
                prelogin_banner_id: document.getElementById('templateBanner').value || null,
            };
            const method = templateId ? 'PUT' : 'POST';
            const endpoint = templateId ? `/api/templates/${templateId}` : '/api/templates';
            try {
                const result = await apiRequest(endpoint, method, templateData);
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
                const banners = await apiRequest('/api/banners');
                bannerSelect.innerHTML = '<option value="">Nenhum</option>';
                banners.forEach(banner => {
                    if (banner.type === 'pre-login' && banner.is_active) {
                        const option = document.createElement('option');
                        option.value = banner.id;
                        option.textContent = `${banner.name} (ID: ${banner.id})`;
                        bannerSelect.appendChild(option);
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
            document.getElementById('templateLogoUrl').value = template.logo_url || '';
            document.getElementById('templateBgUrl').value = template.login_background_url || '';
            document.getElementById('templateVideoUrl').value = template.promo_video_url || '';
            videoUrlGroup.style.display = template.base_model === 'V2' ? 'block' : 'none';
            document.getElementById('templateVideoUrl').required = template.base_model === 'V2';
            loadBannersIntoSelect().then(() => {
                bannerSelect.value = template.prelogin_banner_id || '';
            });
            modalTitle.textContent = 'Editar Template';
            modal.classList.remove('hidden');
        };

        const closeModal = () => modal.classList.add('hidden');

        // --- EVENT LISTENERS ---
        baseModelSelect.addEventListener('change', () => {
            videoUrlGroup.style.display = baseModelSelect.value === 'V2' ? 'block' : 'none';
        });
        addTemplateBtn.addEventListener('click', openModalForCreate);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        templateForm.addEventListener('submit', handleFormSubmit);

        // --- INICIALIZAÇÃO DA PÁGINA ---
        loadTemplates();
    };
}

