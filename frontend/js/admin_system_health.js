// Ficheiro: frontend/js/admin_system_health.js

if (window.initSystemHealthPage) {
    console.warn("Tentativa de carregar admin_system_health.js múltiplas vezes.");
} else {
    window.initSystemHealthPage = () => {
        console.log("A inicializar Dashboard de Saúde do Sistema...");

        const loadHealthData = async (showLoader = false) => {
            if (showLoader && window.showPagePreloader) {
                window.showPagePreloader('A verificar saúde do sistema...');
            }

            try {
                const response = await apiRequest('/api/dashboard/health');
                if (!response.success) throw new Error(response.message);
                const data = response.data;

                // PostgreSQL
                const pgCard = document.getElementById('pgHealthCard');
                const pgText = document.getElementById('pgStatusText');
                const pgDetails = document.getElementById('pgStatusDetails');
                
                if (pgCard && pgText && pgDetails) {
                    if (data.postgres.connected) {
                        const icon = pgCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-green';
                        pgText.textContent = 'Online';
                        pgText.style.color = '#38a169';
                        pgDetails.textContent = 'Conexão estável';
                    } else {
                        const icon = pgCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-red';
                        pgText.textContent = 'Offline';
                        pgText.style.color = '#e53e3e';
                        pgDetails.textContent = data.postgres.error || 'Erro desconhecido';
                    }
                }

                // InfluxDB
                const influxCard = document.getElementById('influxHealthCard');
                const influxText = document.getElementById('influxStatusText');
                const influxDetails = document.getElementById('influxStatusDetails');
                
                if (influxCard && influxText && influxDetails) {
                    if (data.influx.connected) {
                        const icon = influxCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-purple';
                        influxText.textContent = 'Online';
                        influxText.style.color = '#38a169';
                        influxDetails.textContent = 'Métricas em tempo real ativas';
                    } else {
                        const icon = influxCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-red';
                        influxText.textContent = 'Offline';
                        influxText.style.color = '#e53e3e';
                        influxDetails.textContent = data.influx.error || 'Verifique as configurações';
                    }
                }

                // Uptime
                const uptime = data.uptime;
                const days = Math.floor(uptime / 86400);
                const hours = Math.floor((uptime % 86400) / 3600);
                const minutes = Math.floor((uptime % 3600) / 60);
                const uptimeText = document.getElementById('serverUptimeText');
                if (uptimeText) uptimeText.textContent = `${days}d ${hours}h ${minutes}m`;

                // Buffer
                const bufferCard = document.getElementById('bufferHealthCard');
                const bufferText = document.getElementById('bufferCountText');
                
                if (bufferCard && bufferText) {
                    bufferText.textContent = data.bufferCount;
                    if (data.bufferCount > 0) {
                        const icon = bufferCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-orange';
                        bufferText.style.color = '#dd6b20';
                    } else {
                        const icon = bufferCard.querySelector('.stat-card-icon');
                        if (icon) icon.className = 'stat-card-icon color-gray';
                        bufferText.style.color = 'var(--text-primary)';
                    }
                }

                // [NOVO] Hardware do Servidor
                if (data.hardware) {
                    // CPU
                    const cpuText = document.getElementById('serverCpuText');
                    const tempText = document.getElementById('serverTempText');
                    if (cpuText) cpuText.textContent = `${data.hardware.cpu}%`;
                    if (tempText) tempText.textContent = (data.hardware.temp && data.hardware.temp !== 'N/A') ? `Temp: ${data.hardware.temp}°C` : 'Temp: N/A';

                    // Memória
                    const memUsedGB = (data.hardware.memory.used / 1073741824).toFixed(1);
                    const memTotalGB = (data.hardware.memory.total / 1073741824).toFixed(1);
                    const memText = document.getElementById('serverMemText');
                    const memDetails = document.getElementById('serverMemDetails');
                    if (memText) memText.textContent = `${data.hardware.memory.percent}%`;
                    if (memDetails) memDetails.textContent = `${memUsedGB}GB / ${memTotalGB}GB`;

                    // Disco
                    if (data.hardware.disk) {
                        const diskUsedGB = (data.hardware.disk.usedBytes / 1073741824).toFixed(1);
                        const diskTotalGB = (data.hardware.disk.size / 1073741824).toFixed(1);
                        const diskText = document.getElementById('serverDiskText');
                        const diskDetails = document.getElementById('serverDiskDetails');
                        if (diskText) diskText.textContent = `${Math.round(data.hardware.disk.used)}%`;
                        if (diskDetails) diskDetails.textContent = `${diskUsedGB}GB / ${diskTotalGB}GB`;
                    }
                }

                // Recent Errors
                const tbody = document.querySelector('#recentErrorsTable tbody');
                if (tbody) {
                    tbody.innerHTML = '';
                    if (data.recentErrors.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Nenhum erro recente.</td></tr>';
                    } else {
                        data.recentErrors.forEach(err => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${new Date(err.timestamp).toLocaleString()}</td>
                                <td style="color: #fc8181;">${err.error_message}</td>
                            `;
                            tbody.appendChild(row);
                        });
                    }
                }

            } catch (error) {
                console.error("Erro ao carregar saúde do sistema:", error);
                showNotification("Erro ao carregar dados de saúde.", "error");
            } finally {
                if (showLoader && window.hidePagePreloader) {
                    window.hidePagePreloader();
                }
            }
        };

        loadHealthData(true);
        // Auto-refresh a cada 30 segundos
        const interval = setInterval(() => loadHealthData(false), 30000);
        
        // Função de limpeza para parar o intervalo ao sair da página
        window.cleanupSystemHealthPage = () => {
            clearInterval(interval);
        };
    };
}