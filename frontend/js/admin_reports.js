// Ficheiro: frontend/js/admin_reports.js

if (window.initReportsPage) {
    console.warn("Tentativa de carregar admin_reports.js múltiplas vezes.");
} else {
    window.initReportsPage = () => {
        console.log("A inicializar a Central de Relatórios...");

        const reportTypeSelect = document.getElementById('reportTypeSelect');
        const filtersArea = document.getElementById('reportFiltersArea');
        const filtersGrid = document.getElementById('dynamicFiltersGrid');
        const previewArea = document.getElementById('reportPreviewArea');
        const previewTable = document.getElementById('previewTable');
        const totalRecordsCount = document.getElementById('totalRecordsCount');
        
        const btnPreview = document.getElementById('generatePreviewBtn');
        const btnExcel = document.getElementById('exportExcelBtn');
        const btnCsv = document.getElementById('exportCsvBtn');
        const btnPdf = document.getElementById('exportPdfBtn');

        let currentData = []; // Armazena os dados carregados para exportação
        let currentReportConfig = null; // Configuração do relatório ativo

        // Configurações de cada tipo de relatório
        const reportConfigs = {
            'hotspot_users': {
                title: 'Utilizadores do Hotspot',
                endpoint: '/api/hotspot/users',
                filters: [
                    { id: 'startDate', label: 'Data Início (Cadastro)', type: 'date' },
                    { id: 'endDate', label: 'Data Fim (Cadastro)', type: 'date' },
                    { id: 'routerId', label: 'Roteador', type: 'select', source: '/api/routers', key: 'id', text: 'name' }
                ],
                columns: [
                    { key: 'name', label: 'Nome' },
                    { key: 'email', label: 'E-mail' },
                    { key: 'phone', label: 'Telefone' },
                    { key: 'router_name', label: 'Roteador' },
                    { key: 'created_at', label: 'Cadastro' }
                ]
            },
            'audit_logs': {
                title: 'Logs de Auditoria',
                endpoint: '/api/logs/activity',
                filters: [
                    { id: 'keyword', label: 'Palavra-chave', type: 'text', placeholder: 'Email, Ação...' },
                    { id: 'startDate', label: 'Data Início', type: 'date' },
                    { id: 'endDate', label: 'Data Fim', type: 'date' }
                ],
                columns: [
                    { key: 'timestamp', label: 'Data/Hora', type: 'datetime' },
                    { key: 'user_email', label: 'Utilizador' },
                    { key: 'action', label: 'Ação' },
                    { key: 'status', label: 'Status' },
                    { key: 'description', label: 'Descrição' }
                ]
            },
            'system_logs': {
                title: 'Logs de Sistema',
                endpoint: '/api/logs/system',
                filters: [
                    { id: 'keyword', label: 'Palavra-chave', type: 'text', placeholder: 'Erro, URL...' },
                    { id: 'startDate', label: 'Data Início', type: 'date' },
                    { id: 'endDate', label: 'Data Fim', type: 'date' }
                ],
                columns: [
                    { key: 'timestamp', label: 'Data/Hora', type: 'datetime' },
                    { key: 'error_message', label: 'Mensagem' },
                    { key: 'request_url', label: 'Endpoint' },
                    { key: 'user_email', label: 'Utilizador' }
                ]
            },
            'routers': {
                title: 'Inventário e Performance de Roteadores',
                endpoint: '/api/routers/report', // [MODIFICADO] Usa a nova rota de relatório detalhado
                filters: [], // Sem filtros por enquanto, lista tudo
                columns: [
                    { key: 'name', label: 'Nome' },
                    { key: 'ip_address', label: 'IP' },
                    { key: 'status', label: 'Status Atual' },
                    { key: 'availability_30d', label: 'Disp. (30d)' }, // [NOVO]
                    { key: 'first_activity', label: 'Primeira Atividade' }, // [NOVO]
                    { key: 'observacao', label: 'Observação' }
                ]
            },
            'raffles': {
                title: 'Sorteios Realizados',
                endpoint: '/api/raffles',
                filters: [],
                columns: [
                    { key: 'raffle_number', label: 'Número' },
                    { key: 'title', label: 'Título' },
                    { key: 'created_at', label: 'Data Criação', type: 'datetime' },
                    { key: 'winner_name', label: 'Vencedor' }
                ]
            },
            'lgpd_requests': {
                title: 'Pedidos LGPD',
                endpoint: '/api/lgpd/requests',
                filters: [],
                columns: [
                    { key: 'user_email', label: 'E-mail' },
                    { key: 'request_date', label: 'Data Pedido', type: 'datetime' },
                    { key: 'status', label: 'Status' },
                    { key: 'completion_date', label: 'Conclusão', type: 'datetime' }
                ]
            },
            'lgpd_logs': {
                title: 'Logs de Atividade LGPD',
                endpoint: '/api/lgpd/logs',
                filters: [],
                columns: [
                    { key: 'timestamp', label: 'Data/Hora', type: 'datetime' },
                    { key: 'user_email', label: 'Administrador' },
                    { key: 'action', label: 'Ação' },
                    { key: 'description', label: 'Descrição' }
                ]
            },
            'router_clients': {
                title: 'Clientes Conectados (Por Roteador)',
                endpoint: '/api/monitoring/router/:routerId/clients', // Endpoint dinâmico
                filters: [
                    { id: 'routerId', label: 'Selecione o Roteador', type: 'select', source: '/api/routers', key: 'id', text: 'name', required: true }
                ],
                // Nota: Este endpoint retorna uma estrutura complexa { dhcp:..., wifi:..., hotspot:... }
                // Precisaremos de uma lógica especial no fetchData para tratar isso ou criar um endpoint unificado no backend.
                // Para simplificar aqui, vamos assumir que o backend pode retornar uma lista plana se passarmos um parametro 'flat=true' ou tratamos no frontend.
                // Como o endpoint atual retorna objeto aninhado, vamos focar nos relatórios que retornam listas planas primeiro.
                // Vou remover este por enquanto para não quebrar a lógica genérica, mas fica a sugestão para criar um endpoint específico de relatório de clientes.
            },
            'banners': {
                title: 'Relatório de Banners',
                endpoint: '/api/banners',
                filters: [],
                columns: [
                    { key: 'name', label: 'Nome' },
                    { key: 'type', label: 'Tipo' },
                    { key: 'is_active', label: 'Ativo', type: 'boolean' },
                    { key: 'display_time_seconds', label: 'Tempo (s)' }
                ]
            },
            'campaigns': {
                title: 'Relatório de Campanhas',
                endpoint: '/api/campaigns',
                filters: [],
                columns: [
                    { key: 'name', label: 'Nome' },
                    { key: 'template_name', label: 'Template' },
                    { key: 'target_type', label: 'Alvo' },
                    { key: 'start_date', label: 'Início', type: 'date' },
                    { key: 'end_date', label: 'Fim', type: 'date' },
                    { key: 'is_active', label: 'Ativa', type: 'boolean' },
                    { key: 'view_count', label: 'Visualizações' }
                ]
            },
            'tickets': {
                title: 'Relatório Geral de Tickets',
                endpoint: '/api/tickets',
                filters: [
                    { id: 'status', label: 'Status', type: 'select', options: [{value: 'open', text: 'Aberto'}, {value: 'in_progress', text: 'Em Andamento'}, {value: 'closed', text: 'Fechado'}] }
                ],
                columns: [
                    { key: 'ticket_number', label: 'Número' },
                    { key: 'title', label: 'Assunto' },
                    { key: 'status', label: 'Status' },
                    { key: 'created_by_email', label: 'Criado Por' },
                    { key: 'created_at', label: 'Data Criação', type: 'datetime' }
                ]
            }
        };

        // --- Funções Auxiliares ---

        const renderFilters = async (config) => {
            filtersGrid.innerHTML = '';
            
            if (config.filters.length === 0) {
                filtersGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">Este relatório não possui filtros adicionais. Clique em "Pré-visualizar" para carregar todos os dados.</p>';
                return;
            }

            for (const filter of config.filters) {
                const group = document.createElement('div');
                group.className = 'input-group';
                
                const label = document.createElement('label');
                label.htmlFor = `filter_${filter.id}`;
                label.textContent = filter.label;
                group.appendChild(label);

                let input;
                if (filter.type === 'select') {
                    input = document.createElement('select');
                    input.innerHTML = '<option value="">Todos</option>';
                    // Carrega opções da API se necessário
                    if (filter.source) {
                        try {
                            const response = await apiRequest(filter.source);
                            const data = response.data || response; // Lida com {data: []} ou []
                            // [CORREÇÃO] Ordena alfabeticamente se for lista de roteadores
                            if (Array.isArray(data)) {
                                if (filter.source.includes('routers')) {
                                    data.sort((a, b) => a.name.localeCompare(b.name));
                                }
                                data.forEach(item => {
                                    const option = document.createElement('option');
                                    option.value = item[filter.key];
                                    option.textContent = item[filter.text];
                                    input.appendChild(option);
                                });
                            }
                        } catch (e) {
                            console.error(`Erro ao carregar opções para ${filter.id}:`, e);
                        }
                    }
                    // [NOVO] Suporte para opções estáticas
                    if (filter.options) {
                        filter.options.forEach(opt => {
                            const option = document.createElement('option');
                            option.value = opt.value;
                            option.textContent = opt.text;
                            input.appendChild(option);
                        });
                    }
                } else {
                    input = document.createElement('input');
                    input.type = filter.type;
                    if (filter.placeholder) input.placeholder = filter.placeholder;
                }
                
                input.id = `filter_${filter.id}`;
                input.name = filter.id;
                group.appendChild(input);
                filtersGrid.appendChild(group);
            }
        };

        const fetchData = async () => {
            if (!currentReportConfig) return;

            window.showPagePreloader('A gerar relatório...');
            btnPreview.disabled = true;
            
            // Coleta valores dos filtros
            const params = new URLSearchParams();
            currentReportConfig.filters.forEach(filter => {
                const el = document.getElementById(`filter_${filter.id}`);
                if (el && el.value) {
                    params.append(filter.id, el.value);
                }
            });

            try {
                const url = `${currentReportConfig.endpoint}?${params.toString()}`;
                const response = await apiRequest(url);
                
                // Normaliza a resposta (alguns endpoints retornam array direto, outros {data: []})
                let data = response.data || response;
                // [CORREÇÃO] Se for objeto paginado (ex: tickets), tenta pegar o array interno
                if (data.tickets) data = data.tickets; 
                
                if (!Array.isArray(data)) {
                    throw new Error("Formato de dados inválido recebido da API.");
                }

                currentData = data;
                renderPreview(data);
                
                // Habilita botões de exportação se houver dados
                const hasData = data.length > 0;
                btnExcel.disabled = !hasData;
                btnCsv.disabled = !hasData;
                btnPdf.disabled = !hasData;

                if (!hasData) {
                    showNotification('Nenhum registo encontrado com os filtros selecionados.', 'info');
                }

            } catch (error) {
                console.error("Erro ao gerar relatório:", error);
                showNotification(`Erro ao gerar relatório: ${error.message}`, 'error');
                previewTable.querySelector('tbody').innerHTML = `<tr><td colspan="100" style="text-align:center; color: var(--error-text);">Erro ao carregar dados.</td></tr>`;
            } finally {
                window.hidePagePreloader();
                btnPreview.disabled = false;
            }
        };

        const renderPreview = (data) => {
            previewArea.classList.remove('hidden');
            totalRecordsCount.textContent = data.length;
            
            const thead = previewTable.querySelector('thead');
            const tbody = previewTable.querySelector('tbody');
            
            // Renderiza Cabeçalhos
            thead.innerHTML = '<tr>' + currentReportConfig.columns.map(col => `<th>${col.label}</th>`).join('') + '</tr>';
            
            // Renderiza Dados (Limitado a 20 para preview)
            tbody.innerHTML = '';
            const previewData = data.slice(0, 20);
            
            previewData.forEach(row => {
                const tr = document.createElement('tr');
                currentReportConfig.columns.forEach(col => {
                    const td = document.createElement('td');
                    let val = row[col.key];
                    
                    // Formatação básica
                    if (val === null || val === undefined) val = 'N/A';
                    else if (col.type === 'datetime') val = new Date(val).toLocaleString('pt-BR');
                    else if (col.type === 'date') val = new Date(val).toLocaleDateString('pt-BR');
                    else if (col.type === 'boolean') val = val ? 'Sim' : 'Não'; // [NOVO]
                    
                    td.textContent = val;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });

            if (data.length > 20) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="${currentReportConfig.columns.length}" style="text-align: center; font-style: italic; color: var(--text-secondary);">... e mais ${data.length - 20} registos (exporte para ver tudo) ...</td>`;
                tbody.appendChild(tr);
            }
        };

        // --- Funções de Exportação ---

        const exportToExcel = () => {
            if (!currentData.length) return;
            
            // Mapeia os dados para as colunas configuradas
            const exportData = currentData.map(row => {
                const mappedRow = {};
                currentReportConfig.columns.forEach(col => {
                    let val = row[col.key];
                    if (val === null || val === undefined) val = '';
                    else if (col.type === 'datetime') val = new Date(val).toLocaleString('pt-BR');
                    else if (col.type === 'date') val = new Date(val).toLocaleDateString('pt-BR');
                    else if (col.type === 'boolean') val = val ? 'Sim' : 'Não';
                    mappedRow[col.label] = val;
                });
                return mappedRow;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Relatório");
            XLSX.writeFile(wb, `Relatorio_${currentReportConfig.title.replace(/ /g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
        };

        const exportToCsv = () => {
            if (!currentData.length) return;
            
            const headers = currentReportConfig.columns.map(c => c.label);
            const rows = currentData.map(row => 
                currentReportConfig.columns.map(col => {
                    let val = row[col.key];
                    if (val === null || val === undefined) val = '';
                    else if (col.type === 'datetime') val = new Date(val).toLocaleString('pt-BR');
                    else if (col.type === 'date') val = new Date(val).toLocaleDateString('pt-BR');
                    else if (col.type === 'boolean') val = val ? 'Sim' : 'Não';
                    return `"${String(val).replace(/"/g, '""')}"`; // Escape quotes
                }).join(',')
            );
            
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Relatorio_${currentReportConfig.title.replace(/ /g, '_')}.csv`;
            link.click();
        };

        const exportToPdf = () => {
            if (!currentData.length || !window.jspdf) return;
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(16);
            doc.text(currentReportConfig.title, 14, 20);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
            
            const headers = [currentReportConfig.columns.map(c => c.label)];
            const data = currentData.map(row => 
                currentReportConfig.columns.map(col => {
                    let val = row[col.key];
                    if (val === null || val === undefined) val = '';
                    else if (col.type === 'datetime') val = new Date(val).toLocaleString('pt-BR');
                    else if (col.type === 'date') val = new Date(val).toLocaleDateString('pt-BR');
                    else if (col.type === 'boolean') val = val ? 'Sim' : 'Não';
                    return String(val);
                })
            );

            doc.autoTable({
                startY: 35,
                head: headers,
                body: data,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 153, 225] } // Azul do tema
            });
            
            doc.save(`Relatorio_${currentReportConfig.title.replace(/ /g, '_')}.pdf`);
        };

        // --- Event Listeners ---

        reportTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            
            // Reseta estado
            currentData = [];
            previewArea.classList.add('hidden');
            btnExcel.disabled = true;
            btnCsv.disabled = true;
            btnPdf.disabled = true;

            if (type && reportConfigs[type]) {
                currentReportConfig = reportConfigs[type];
                filtersArea.classList.remove('hidden');
                renderFilters(currentReportConfig);
            } else {
                currentReportConfig = null;
                filtersArea.classList.add('hidden');
            }
        });

        btnPreview.addEventListener('click', fetchData);
        btnExcel.addEventListener('click', exportToExcel);
        btnCsv.addEventListener('click', exportToCsv);
        btnPdf.addEventListener('click', exportToPdf);
    };
}           