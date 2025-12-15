if (window.initBannersPage) {
    console.warn("Tentativa de carregar admin_banners.js múltiplas vezes. A segunda execução foi ignorada.");
} else {
    window.initBannersPage = () => {
        console.log("A inicializar a página de gestão de Banners...");

        // --- ELEMENTOS DO DOM ---
        const addBannerBtn = document.getElementById('addBannerBtn');
        const modal = document.getElementById('bannerModal');
        const tableBody = document.querySelector('#bannersTable tbody');
        
        // Elementos do Modal
        const closeBtn = modal.querySelector('.modal-close-btn');
        const cancelBtn = modal.querySelector('#cancelBtn');
        const bannerForm = document.getElementById('bannerForm');
        const modalTitle = document.getElementById('modalTitle');
        const bannerIdInput = document.getElementById('bannerId');
        const bannerNameInput = document.getElementById('bannerName');
        const bannerTypeSelect = document.getElementById('bannerType');
        const sourceUploadRadio = document.getElementById('sourceUpload');
        const sourceUrlRadio = document.getElementById('sourceUrl');
        const uploadGroup = document.getElementById('uploadGroup');
        const urlGroup = document.getElementById('urlGroup');
        const bannerImageFileInput = document.getElementById('bannerImageFile');
        const bannerImageUrlInput = document.getElementById('bannerImageUrl');
        const imagePreview = document.getElementById('bannerImagePreview');
        const previewPlaceholder = document.getElementById('previewPlaceholder');
        const bannerTargetUrlInput = document.getElementById('bannerTargetUrl');
        const bannerDisplayTimeInput = document.getElementById('bannerDisplayTime');
        const bannerIsActiveCheckbox = document.getElementById('bannerIsActive');
        
        // --- FUNÇÕES DE LÓGICA ---

        let allBannersData = []; // Cache para os dados dos banners

        const loadBanners = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">A carregar...</td></tr>';
            try {
                const response = await apiRequest('/api/banners');
                // [CORRIGIDO] Torna a verificação mais robusta, aceitando um array direto ou um objeto com a propriedade 'data'.
                const banners = response.data || response;
                if (!Array.isArray(banners)) {
                     throw new Error(response.message || "Erro desconhecido ao carregar banners.");
                }
                allBannersData = banners; // Armazena os dados no cache
                tableBody.innerHTML = '';
                if (banners.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">Nenhum banner encontrado.</td></tr>';
                    return;
                }
                banners.forEach(banner => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${banner.id}</td>
                        <td>${banner.name}</td>
                        <td>${banner.type}</td>
                        <td><span class="badge status-${banner.is_active ? 'active' : 'inactive'}">${banner.is_active ? 'Ativo' : 'Inativo'}</span></td>
                        <td class="action-buttons">
                            <button class="btn-edit" data-banner-id="${banner.id}">Editar</button>
                            <button class="btn-delete" data-banner-id="${banner.id}">Eliminar</button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } catch (error) {
                tableBody.innerHTML = `<tr><td colspan="5">Erro ao carregar banners.</td></tr>`;
            }
        };
        
        const handleFormSubmit = async (event) => {
            event.preventDefault();

            const bannerId = bannerIdInput.value;
            const formData = new FormData();

            // Adiciona os campos de texto ao FormData
            formData.append('name', bannerNameInput.value);
            formData.append('type', bannerTypeSelect.value);
            formData.append('target_url', bannerTargetUrlInput.value);
            formData.append('display_time_seconds', parseInt(bannerDisplayTimeInput.value, 10));
            formData.append('is_active', bannerIsActiveCheckbox.checked);

            // Lógica para a imagem: ou ficheiro ou URL
            if (sourceUploadRadio.checked && bannerImageFileInput.files[0]) {
                formData.append('bannerImage', bannerImageFileInput.files[0]);
            } else if (sourceUrlRadio.checked && bannerImageUrlInput.value) {
                formData.append('image_url', bannerImageUrlInput.value);
            } else if (!bannerId) { 
                // Se for criação e não houver nem ficheiro nem URL, mostra erro.
                showNotification('Por favor, forneça uma imagem (via upload ou URL).', 'error');
                return;
            }

            let method = bannerId ? 'PUT' : 'POST';
            let endpoint = bannerId ? `/api/banners/${bannerId}` : '/api/banners';

            // Simula o PUT para funcionar com FormData
            if (method === 'PUT') {
                formData.append('_method', 'PUT');
                method = 'POST';
            }

            try {
                const result = await apiRequest(endpoint, method, formData);
                showNotification(result.message, 'success');
                closeModal();
                loadBanners();
            } catch (error) {
                showNotification(`Erro: ${error.message}`, 'error');
            }
        };

        const handleDelete = async (bannerId) => {
            const confirmed = await showConfirmationModal(`Tem a certeza de que deseja eliminar o banner com ID ${bannerId}?`);
            if (confirmed) {
                try {
                    const result = await apiRequest(`/api/banners/${bannerId}`, 'DELETE');
                    showNotification(result.message, 'success');
                    loadBanners();
                } catch (error) {
                    showNotification(`Erro: ${error.message}`, 'error');
                }
            }
        };

        // --- FUNÇÕES DO MODAL ---
        const resetModal = () => {
            bannerForm.reset();
            bannerIdInput.value = '';
            sourceUploadRadio.checked = true;
            toggleImageSource();
            updateImagePreview('');
        };

        const openModalForCreate = () => {
            resetModal();
            modalTitle.textContent = 'Adicionar Novo Banner';
            // [CORREÇÃO] Garante que o conteúdo do modal role para o topo ao abrir
            modal.querySelector('.modal-content').scrollTop = 0;
            modal.classList.remove('hidden');
        };

        const openModalForEdit = async (bannerId) => {
            resetModal();
            try {                
                const banner = allBannersData.find(b => b.id === bannerId);
                if (!banner) {
                    showNotification('Banner não encontrado. Por favor, recarregue a página.', 'error');
                    return;
                }

                modalTitle.textContent = 'Editar Banner';
                bannerIdInput.value = banner.id;
                bannerNameInput.value = banner.name;
                bannerTypeSelect.value = banner.type;
                bannerIsActiveCheckbox.checked = banner.is_active;
                bannerImageUrlInput.value = banner.image_url;
                bannerTargetUrlInput.value = banner.target_url;
                bannerDisplayTimeInput.value = banner.display_time_seconds;

                // Define o modo de URL por defeito ao editar
                sourceUrlRadio.checked = true;
                toggleImageSource();
                updateImagePreview(banner.image_url);

                // [CORREÇÃO] Garante que o conteúdo do modal role para o topo ao abrir
                modal.querySelector('.modal-content').scrollTop = 0;
                modal.classList.remove('hidden');
            } catch (error) {
                showNotification(`Erro ao carregar dados do banner: ${error.message}`, 'error');
            }
        };

        const closeModal = () => modal.classList.add('hidden');
        
        const toggleImageSource = () => {
            if (sourceUploadRadio.checked) {
                uploadGroup.classList.remove('hidden');
                urlGroup.classList.add('hidden');
                bannerImageUrlInput.required = false;
            } else {
                uploadGroup.classList.add('hidden');
                urlGroup.classList.remove('hidden');
                bannerImageUrlInput.required = true;
            }
        };
        
        const updateImagePreview = (url) => {
            if (url) {
                imagePreview.src = url.startsWith('/') ? `http://localhost:3000${url}` : url;
                imagePreview.classList.remove('hidden');
                previewPlaceholder.classList.add('hidden');
            } else {
                imagePreview.src = '';
                imagePreview.classList.add('hidden');
                previewPlaceholder.classList.remove('hidden');
            }
        };

        // --- EVENT LISTENERS ---
        addBannerBtn.addEventListener('click', openModalForCreate);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        bannerForm.addEventListener('submit', handleFormSubmit);
        
        sourceUploadRadio.addEventListener('change', toggleImageSource);
        sourceUrlRadio.addEventListener('change', toggleImageSource);
        
        bannerImageFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => updateImagePreview(e.target.result);
                reader.readAsDataURL(file);
            }
        });
        
        bannerImageUrlInput.addEventListener('input', () => {
            updateImagePreview(bannerImageUrlInput.value);
        });

        tableBody.addEventListener('click', (event) => {
            const target = event.target;
            const bannerId = parseInt(target.getAttribute('data-banner-id'));
            if (target.classList.contains('btn-edit')) {
                openModalForEdit(bannerId);
            } else if (target.classList.contains('btn-delete')) {
                handleDelete(bannerId);
            }
        });

        // --- INICIALIZAÇÃO ---
        loadBanners();
    };
}
