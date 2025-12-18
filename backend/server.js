console.log("--- [GEMINI] EXECUTANDO A VERSÃO MAIS RECENTE DO SERVIDOR ---");

// Ficheiro: backend/server.js
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./connection');
const methodOverride = require('method-override'); // [NOVO] Importa o method-override

// [NOVO] Registra o momento em que o servidor inicia para calcular o uptime.
const serverStartTime = new Date();
const ping = require('ping'); // [NOVO] Importa a biblioteca de ping para a verificação

// Importação das rotas
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
const publicRoutes = require('./routes/publicRoutes'); // [NOVO] Importa as rotas públicas
// [NOVO] Importa as rotas do dashboard analítico
const dashboardAnalyticsRoutes = require('./routes/AnalyticsRoutes');
const monitoringRoutes = require('./routes/monitoring'); // <-- 1. IMPORTE A NOVA ROTA

const app = express();
const PORT = process.env.PORT || 3000;

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

// [NOVO] Serve ficheiros estáticos da pasta 'Rede'
// Torna a pasta 'Rede' acessível via URL
// Ex: http://localhost:3000/Rede/pages/router_analytics.html
app.use(express.static(path.join(__dirname, '../Rede')));


// --- Definição das Rotas da API ---
// Mapeia os prefixos de URL para os ficheiros de rotas correspondentes
app.use('/api/auth', authRoutes);         // Rotas de autenticação (login, forgot, reset)
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
app.use('/api/public', publicRoutes);     // [NOVO] Regista as rotas públicas
// [NOVO] Monta as novas rotas sob o prefixo /api/dashboard/analytics
app.use('/api/dashboard/analytics', dashboardAnalyticsRoutes);
app.use('/api/monitoring', monitoringRoutes); // <-- 2. USE A NOVA ROTA

// --- [NOVO] Rotas de Logs ---
const logRoutes = require('./routes/logRoutes');
app.use('/api/logs', logRoutes);
 

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
app.use((err, req, res, next) => {
  console.error("🔥 Erro não tratado:", err.stack || err);
  res.status(500).json({ message: "Ocorreu um erro inesperado no servidor." });
});

// --- [NOVO] Verificação Periódica de Status dos Roteadores ---
const startPeriodicRouterCheck = () => {
  console.log('✅ [SRV-ADM] Agendando verificação periódica de status de roteadores (a cada 60 segundos)...');
  
  const checkRouters = async () => {
    console.log('🔄 [ROUTER-CHECK] Iniciando ciclo de verificação de status...');
    const client = await pool.connect();
    try {
      // [CORRIGIDO] Primeiro, marca como 'offline' todos os roteadores que não têm IP.
      // Isso garante que, se um IP for removido, o status seja atualizado corretamente.
      await client.query(
        "UPDATE routers SET status = 'offline' WHERE ip_address IS NULL AND status != 'offline'"
      );

      // Busca apenas roteadores que têm um endereço IP definido
      const routersResult = await client.query('SELECT id, ip_address FROM routers WHERE ip_address IS NOT NULL');
      const routersToCheck = routersResult.rows;

      if (routersToCheck.length === 0) {
        console.log('⏹️ [ROUTER-CHECK] Nenhum roteador com IP configurado para verificar. Ciclo concluído.');
        return;
      }

      // Itera sobre cada roteador e verifica o status
      for (const router of routersToCheck) {
        const pingResult = await ping.promise.probe(router.ip_address);
        const newStatus = pingResult.alive ? 'online' : 'offline';
        
        // Atualiza o status e a data da última verificação no banco de dados
        await client.query(
          'UPDATE routers SET status = $1, last_seen = NOW() WHERE id = $2',
          [newStatus, router.id]
        );
      }
      console.log(`⏹️ [ROUTER-CHECK] Ciclo de verificação concluído. ${routersToCheck.length} roteador(es) verificado(s).`);
    } catch (error) {
      console.error('❌ [ROUTER-CHECK] Erro durante a verificação periódica de roteadores:', error);
    } finally {
      client.release();
    }
  };
  setInterval(checkRouters, 60000); // Executa a cada 60 segundos
};

// --- Inicia o Servidor ---
// Começa a escutar por conexões na porta definida
app.listen(PORT, async () => {
  console.log(`✅ [SRV-ADM] Servidor iniciado na porta ${PORT}`);
  // Tenta conectar ao DB e inicializar o esquema ao iniciar
  try {
    const client = await pool.connect();
    console.log("✅ [SRV-ADM] Ligação com o PostgreSQL estabelecida com sucesso!");
    // [NOVO] Inicia a verificação periódica após a conexão com o banco ser confirmada
    startPeriodicRouterCheck();
    client.release(); // Libera o cliente de volta para o pool
  } catch (error) {
    console.error("❌ [SRV-ADM] ERRO CRÍTICO ao conectar ou inicializar o PostgreSQL:", error);
  }
});

// [NOVO] Exporta a variável para que outras partes da aplicação possam usá-la.
exports.serverStartTime = serverStartTime;
