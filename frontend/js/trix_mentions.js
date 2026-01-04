// Ficheiro: frontend/js/trix_mentions.js
// Descrição: Adiciona funcionalidade de menções (@usuario) ao editor Trix

document.addEventListener('trix-initialize', function(event) {
    const element = event.target;
    const editor = element.editor;
    
    let mentionDropdown = null;
    let usersList = [];
    let activeQuery = null;

    // Cria o dropdown se não existir
    if (!document.getElementById('trix-mentions-dropdown')) {
        mentionDropdown = document.createElement('div');
        mentionDropdown.id = 'trix-mentions-dropdown';
        mentionDropdown.className = 'trix-mentions-dropdown';
        document.body.appendChild(mentionDropdown);
    } else {
        mentionDropdown = document.getElementById('trix-mentions-dropdown');
    }

    // Carrega utilizadores da nova rota acessível
    const loadUsers = async () => {
        try {
            // Usa a função global apiRequest se disponível, senão fetch direto
            if (window.apiRequest) {
                const response = await window.apiRequest('/api/admin/users/mention-list');
                if (response.success) usersList = response.data;
            }
        } catch (e) {
            console.error("Erro ao carregar utilizadores para menções:", e);
        }
    };
    loadUsers();

    // Monitoriza a digitação
    element.addEventListener('trix-change', function() {
        const range = editor.getSelectedRange();
        if (range[0] !== range[1]) return; // Ignora se houver seleção

        const cursorIndex = range[0];
        const text = editor.getDocument().toString();
        
        // Procura por @ antes do cursor
        const textBefore = text.slice(0, cursorIndex);
        const lastAt = textBefore.lastIndexOf('@');

        if (lastAt !== -1) {
            const query = textBefore.slice(lastAt + 1);
            // Verifica se não há espaços na query (ex: "@fredson silva" pararia no espaço)
            // E se o @ está no início ou precedido por espaço
            const charBeforeAt = lastAt > 0 ? textBefore[lastAt - 1] : ' ';
            
            if ((charBeforeAt === ' ' || charBeforeAt === '\n') && !query.includes(' ')) {
                activeQuery = query;
                showDropdown(query, element);
                return;
            }
        }
        
        hideDropdown();
    });

    function showDropdown(query, editorElement) {
        const filteredUsers = usersList.filter(u => 
            u.email.toLowerCase().includes(query.toLowerCase()) || 
            (u.role && u.role.toLowerCase().includes(query.toLowerCase()))
        );

        if (filteredUsers.length === 0) {
            hideDropdown();
            return;
        }

        mentionDropdown.innerHTML = '';
        filteredUsers.forEach(user => {
            const item = document.createElement('div');
            item.className = 'trix-mention-item';
            // Usa avatar se existir, ou ícone genérico
            const avatarHtml = user.avatar_url 
                ? `<img src="http://${window.location.hostname}:3000${user.avatar_url}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
                : `<i class="fas fa-user-circle" style="font-size:24px;color:#ccc;"></i>`;

            item.innerHTML = `
                ${avatarHtml}
                <span>${user.email.split('@')[0]}</span>
                <span class="mention-role">${user.role}</span>
            `;
            
            item.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Previne perder o foco do editor
                insertMention(user);
            });
            
            mentionDropdown.appendChild(item);
        });

        // Posicionamento do Dropdown
        const rect = editorElement.getBoundingClientRect();
        // Nota: Posicionamento exato do cursor no Trix é complexo, 
        // posicionamos abaixo do editor por simplicidade ou usamos getClientRects se necessário.
        // Aqui posicionamos fixo perto do editor para simplificar.
        
        // Tenta posicionar perto do cursor (aproximação)
        const selectionRect = editorElement.getClientRects()[0]; 
        if (selectionRect) {
            mentionDropdown.style.top = (window.scrollY + rect.bottom + 5) + 'px';
            mentionDropdown.style.left = (window.scrollX + rect.left + 20) + 'px';
        }

        mentionDropdown.classList.add('visible');
    }

    function hideDropdown() {
        if (mentionDropdown) mentionDropdown.classList.remove('visible');
        activeQuery = null;
    }

    function insertMention(user) {
        const range = editor.getSelectedRange();
        const currentPos = range[0];
        const startPos = currentPos - activeQuery.length - 1; // -1 para o @

        editor.setSelectedRange([startPos, currentPos]);
        editor.deleteInDirection("backward");
        
        const mentionName = "@" + user.email.split('@')[0];
        
        // Insere a menção como HTML formatado
        editor.insertHTML(`<span class="mention-tag" data-user-id="${user.id}">${mentionName}</span>&nbsp;`);
        
        // [NOVO] Envia notificação para o backend
        const editorElement = editor.element;
        const ticketId = editorElement.dataset.ticketId;
        
        if (ticketId && user.id) {
            try {
                // Não precisa esperar (await), pode ser "fire and forget"
                window.apiRequest(`/api/admin/tickets/${ticketId}/mention`, 'POST', {
                    mentionedUserId: user.id
                });
            } catch (e) {
                console.warn("Falha ao enviar notificação de menção:", e);
            }
        }

        hideDropdown();
    }

    // Navegação por teclado no dropdown (opcional, básico)
    element.addEventListener('keydown', function(e) {
        if (!mentionDropdown.classList.contains('visible')) return;

        if (e.key === 'Escape') {
            hideDropdown();
            e.preventDefault();
        }
        // Implementar setas cima/baixo se desejar
    });
});