// Ficheiro: backend/server.js
const path = require('path');
const fs = require('fs');

// [CORREÇÃO DEFINITIVA] Carrega o ficheiro .env APENAS em ambiente de desenvolvimento.
// Em produção, as variáveis de ambiente devem vir EXCLUSIVAMENTE do ecosystem.config.js
// para evitar conflitos como o que está a acontecer.
if (process.env.NODE_ENV !== 'production') {
    console.log('[SERVER] Ambiente de desenvolvimento detectado. A carregar .env...');
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
    }
}

const express = require('express'); // [CORREÇÃO] A importação do express já existe.
const http = require('http'); // [NOVO] Necessário para Socket.io
const { Server } = require("socket.io"); // [NOVO] Socket.io
const rateLimit = require('express-rate-limit'); // [NOVO] Rate Limiting
const cors = require('cors');
const { pool, testInitialConnection, pgConnectionStatus, startPgReconnect } = require('./connection'); // [MODIFICADO]
const methodOverride = require('method-override'); // [NOVO] Importa o method-override
// [NOVO] Guardião Global para evitar crashes por erros de protocolo do MikroTik
process.on('uncaughtException', (err) => {
    const msg = err.message || String(err);
    if (msg.includes('Tried to process unknown reply') || msg.includes('UNKNOWNREPLY') || msg.includes('!empty') || msg.includes('!trap')) {
        console.warn(`[SERVER] ⚠️ Erro de protocolo MikroTik ignorado para manter o servidor online: ${msg}`);
        return;
    }
    console.error('🔥 Erro Crítico Não Tratado:', err);
    process.exit(1); // Sai para o PM2 reiniciar em erros reais
});

process.on('unhandledRejection', (reason, promise) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    if (msg.includes('Tried to process unknown reply') || msg.includes('!empty')) {
         return;
    }
    console.error('🔥 Promessa Rejeitada Não Tratada:', reason);
});

// [NOVO] Registra o momento em que o servidor inicia para calcular o uptime.
const serverStartTime = new Date();
const ping = require('ping'); // [NOVO] Importa a biblioteca de ping para a verificação

// Importação das rotas
const influxService = require('./services/influxService'); // [NOVO] Importa o serviço Influx
const { logAction } = require('./services/auditLogService');
const { logError } = require('./services/errorLogService'); // [NOVO] Importa o serviço de log de erros
const verifyToken = require('./middlewares/authMiddleware'); // [NOVO] Importa middleware de auth
const checkPermission = require('./middlewares/roleMiddleware'); // [NOVO] Importa middleware de permissão
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const routerRoutes = require('./routes/routers');
const templateRoutes = require('./routes/templates');
const campaignRoutes = require('./routes/campaigns');
const bannerRoutes = require('./routes/banners');
const hotspotRoutes = require('./routes/hotspot');
const settingsRoutes = require('./routes/settings'); // Rota de configurações
const permissionsRoutes = require('./routes/permissions'); // [NOVO] Importa as rotas de permissões
const lgpdRoutes = require('./routes/lgpd');
const ticketRoutes = require('./routes/tickets');
const notificationRoutes = require('./routes/notificationRoutes');
const raffleRoutes = require('./routes/raffles');
const dashboardRoutes = require('./routes/dashboard'); // [NOVO] Importa a rota do dashboard
const dashboardAnalyticsRoutes = require('./routes/AnalyticsRoutes'); // [NOVO] Importa as rotas do dashboard analítico
const publicRoutes = require('./routes/publicRoutes'); // [NOVO] Importa as rotas públicas
const monitoringRoutes = require('./routes/monitoring'); // <-- 1. IMPORTE A NOVA ROTA
const profileRoutes = require('./routes/profileRoutes'); // [NOVO]
const roleRoutes = require('./routes/roleRoutes');       // [NOVO]
const publicTicketRoutes = require('./routes/publicTicketRoutes'); // [NOVO]
const searchRoutes = require('./routes/search'); // [NOVO]

const app = express();
const server = http.createServer(app); // [MODIFICADO] Cria servidor HTTP
const io = new Server(server, {
    cors: {
        origin: "*", // Ajuste conforme necessário para produção
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

app.set('io', io); // Torna o 'io' acessível nos controllers via req.app.get('io')

// --- Middlewares Essenciais ---
app.use(cors()); // Permite requisições de origens diferentes (ex: frontend em porta diferente)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Necessário para method-override ler o corpo

// [NOVO] Configura o method-override para procurar por _method no corpo da requisição
// Isto permite que formulários FormData que usam POST simulem requisições PUT.
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // procura em corpos de requisição urlencoded e multipart
    var method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// --- [NOVO] Rate Limiting ---
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 5, // Limite de 5 tentativas
    message: { message: "Muitas tentativas de login. Por favor, tente novamente em 1 minuto." },
    standardHeaders: true,
    legacyHeaders: false,
});

const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limite de 100 requisições por IP
    standardHeaders: true,
    legacyHeaders: false,
});


// --- Servir Ficheiros Estáticos ---
// Torna a pasta 'public' (e subpastas como 'uploads') acessível via URL
// Ex: http://localhost:3000/uploads/logos/company_logo.png
// [CORRIGIDO] Aponta para a pasta 'public' dentro de 'backend' onde estão os uploads.
app.use(express.static(path.join(__dirname, 'public')));

// [MELHORIA] Mapeamento explícito da rota '/uploads' para garantir que os caminhos do banco
// (que começam com /uploads/) sejam sempre resolvidos corretamente, independente da origem.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// [SEGURANÇA] Adiciona fallback para a pasta 'public' na raiz do projeto, caso as imagens
// estejam lá (como sugerido pelo script.js que usa '../public').
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// [CORREÇÃO] Serve a pasta 'frontend' como raiz para ficheiros HTML como support_request.html
// Isso permite acessar http://localhost:3000/support_request.html diretamente
app.use(express.static(path.join(__dirname, '../frontend')));

// [NOVO] Serve ficheiros estáticos da pasta 'Rede'
// Torna a pasta 'Rede' acessível via URL
// Ex: http://localhost:3000/Rede/pages/router_analytics.html
app.use(express.static(path.join(__dirname, '../Rede')));


// --- Definição das Rotas da API ---
// Mapeia os prefixos de URL para os ficheiros de rotas correspondentes
app.use('/api/auth', loginLimiter, authRoutes); // [MODIFICADO] Aplica Rate Limit no Login
app.use('/api/admin', adminRoutes);       // Rotas de administração (utilizadores, perfil)

app.use('/api/routers', routerRoutes);    // Rotas de roteadores e grupos
app.use('/api/templates', templateRoutes); // Rotas de templates
app.use('/api/campaigns', campaignRoutes); // Rotas de campanhas
app.use('/api/banners', bannerRoutes);     // Rotas de banners
app.use('/api/hotspot', hotspotRoutes);    // Rotas do portal hotspot (pesquisa, contagem)
app.use('/api/settings', settingsRoutes);  // [NOVO] Rotas de configurações
app.use('/api/permissions', permissionsRoutes); // [NOVO] Regista as rotas de permissões
app.use('/api/lgpd', lgpdRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/raffles', raffleRoutes);
app.use('/api/dashboard', dashboardRoutes); // [NOVO] Regista a rota do dashboard
app.use('/api/dashboard/analytics', dashboardAnalyticsRoutes); // [NOVO] Regista as rotas analíticas detalhadas
app.use('/api/public', publicApiLimiter, publicRoutes);     // [MODIFICADO] Aplica Rate Limit
app.use('/api/public/tickets', publicApiLimiter, publicTicketRoutes); // [MODIFICADO] Aplica Rate Limit
app.use('/api/monitoring', monitoringRoutes); // <-- 2. USE A NOVA ROTA

// --- [NOVO] Rotas de Logs ---
const logRoutes = require('./routes/logRoutes');
app.use('/api/logs', logRoutes);
app.use('/api/admin/profile', profileRoutes); // [NOVO] Rota para o perfil
app.use('/api/roles', roleRoutes);            // [NOVO] Rota para gestão de perfis
app.use('/api/search', searchRoutes);         // [NOVO] Rota de busca global
 

// --- Rota de Teste Principal ---
// Responde a GET / para verificar se o servidor está online
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Bem-vindo à API de Gerenciamento de Hotspot! O servidor está a funcionar.' });
});

// --- Rota de Teste de Conexão com a Base de Dados ---
// Responde a GET /api/db-test para verificar a ligação ao PostgreSQL
app.get('/api/db-test', async (req, res) => {
  try {
    // Tenta executar uma query simples
    const timeResult = await pool.query('SELECT NOW()');
    // Se sucesso, retorna a hora atual do banco
    res.status(200).json({
      message: "✅ Conexão com o PostgreSQL estabelecida com sucesso!",
      databaseTime: timeResult.rows[0].now,
    });
  } catch (error) {
    // Se falhar, retorna um erro 500
    console.error('❌ Erro de conexão com a base de dados:', error);
    res.status(500).json({ message: "❌ Falha ao conectar à base de dados.", error: error.message });
  }
});

// --- Middleware de Tratamento de Erros Genérico (Opcional, mas bom ter) ---
// Captura erros não tratados em outras partes da aplicação
app.use(async (err, req, res, next) => {
  console.error("🔥 Erro não tratado:", err.stack || err);
  // [NOVO] Grava o erro no banco de dados
  await logError(err, req);
  res.status(500).json({ message: "Ocorreu um erro inesperado no servidor." });
});

// --- [NOVO] Verificação Periódica de Status dos Roteadores ---
let isRouterCheckRunning = false; // [NOVO] Flag para evitar sobreposição de verificações

const startPeriodicRouterCheck = () => {
    // [MODIFICADO] Só agenda se o PG estiver conectado
    if (!pgConnectionStatus.connected) {
        console.warn('🟡 [ROUTER-CHECK] Verificação periódica de roteadores em espera. Aguardando conexão com o PostgreSQL...');
        return;
    }

    // console.log('✅ [SRV-ADM] Agendando verificação periódica de status de roteadores (a cada 60 segundos)...');
    
    const checkRouters = async () => {
        // [NOVO] Se a verificação anterior ainda estiver a rodar, pula esta vez
        if (isRouterCheckRunning) {
            console.log('⏳ [ROUTER-CHECK] Verificação anterior ainda em execução. Pulando ciclo para evitar sobrecarga.');
            return;
        }
        isRouterCheckRunning = true;

        // [MODIFICADO] Verifica a conexão antes de cada ciclo
        if (!pgConnectionStatus.connected) {
            console.warn('🟡 [ROUTER-CHECK] Ciclo de verificação pulado. PostgreSQL está offline.');
            isRouterCheckRunning = false;
            return;
        }
        // console.log('🔄 [ROUTER-CHECK] Iniciando ciclo de verificação de status...');
        let client;
        // [CORREÇÃO] Define a função de erro fora para poder removê-la depois
        const dbErrorHandler = (err) => {
            console.error('❌ [ROUTER-CHECK] Erro silencioso no cliente DB ativo:', err.message);
        };

        try {
            client = await pool.connect();
            client.on('error', dbErrorHandler);

            await client.query(
                "UPDATE routers SET status = 'offline' WHERE ip_address IS NULL AND status != 'offline'"
            );

            // [MODIFICADO] Seleciona apenas roteadores que NÃO estão em manutenção
            const routersResult = await client.query('SELECT id, ip_address FROM routers WHERE ip_address IS NOT NULL AND is_maintenance = false');
            const routersToCheck = routersResult.rows;
            
            if (routersToCheck.length === 0) {
                // console.log('⏹️ [ROUTER-CHECK] Nenhum roteador com IP configurado para verificar. Ciclo concluído.');
            } else {
                for (const router of routersToCheck) {
                    // [MODIFICADO] Realiza 3 pings para calcular a média
                    let totalLatency = 0;
                    let successCount = 0;
                    
                    for (let i = 0; i < 3; i++) {
                        try {
                            const res = await ping.promise.probe(router.ip_address, { timeout: 2 });
                            if (res.alive) {
                                totalLatency += (typeof res.time === 'number' ? res.time : parseFloat(res.avg));
                                successCount++;
                            }
                        } catch (e) {}
                    }

                    const newStatus = successCount > 0 ? 'online' : 'offline';
                    const latency = successCount > 0 ? Math.round(totalLatency / successCount) : null;
                    
                    await client.query(
                        'UPDATE routers SET status = $1, latency = $2, last_seen = NOW() WHERE id = $3',
                        [newStatus, latency, router.id]
                    );
                    if (latency !== null) {
                        // console.log(`[ROUTER-CHECK] Atualizado ${router.ip_address}: Status=${newStatus}, Latency=${latency}ms`);
                    }
                    
                    // [NOVO] Emite evento via Socket.io para atualização em tempo real
                    io.emit('routerStatusUpdate', { id: router.id, status: newStatus, latency });
                }
                // console.log(`⏹️ [ROUTER-CHECK] Ciclo de verificação concluído. ${routersToCheck.length} roteador(es) verificado(s).`);
            }
        } catch (error) {
            console.error('❌ [ROUTER-CHECK] Erro durante a verificação periódica de roteadores:', error);
            // [NOVO] Se o erro for de conexão, atualiza o status e tenta reconectar
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED') {
                pgConnectionStatus.connected = false;
                pgConnectionStatus.error = error.message;
                startPgReconnect();
            }
        } finally {
            if (client) {
                client.removeListener('error', dbErrorHandler); // [CORREÇÃO] Remove o listener para evitar memory leak
                client.release();
            }
            isRouterCheckRunning = false; // [NOVO] Libera a flag para a próxima execução
        }
    }
    setInterval(checkRouters, 60000); // Executa a cada 60 segundos
};

// --- Inicia o Servidor ---
// [NOVO] Configuração do Socket.io
io.on('connection', (socket) => {
    // console.log('Cliente conectado via Socket.io');
    socket.on('disconnect', () => { /* console.log('Cliente desconectado'); */ });
});

server.listen(PORT, async () => { // [MODIFICADO] Usa server.listen em vez de app.listen
  console.log(`✅ [SRV-ADM] Servidor iniciado na porta ${PORT}`);
  // [MODIFICADO] Tenta a conexão inicial com o PostgreSQL.
  // O servidor continuará a funcionar mesmo que falhe, e tentará reconectar.
  const pgReady = await testInitialConnection();
  
  // O serviço do InfluxDB já tenta conectar-se na sua própria inicialização.
  
  // Inicia a verificação periódica de roteadores (só funcionará se o PG estiver online)
  startPeriodicRouterCheck();

  // [NOVO] Regista o evento de início do servidor no log de auditoria
  await logAction({
      action: 'SERVER_START',
      status: 'SUCCESS',
      description: `Servidor iniciado com sucesso na porta ${PORT}.`
  });
});

// [NOVO] Exporta a variável para que outras partes da aplicação possam usá-la.
exports.serverStartTime = serverStartTime;
