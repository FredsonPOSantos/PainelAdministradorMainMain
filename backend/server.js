// Ficheiro: backend/server.js
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./connection');

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


const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Essenciais ---
app.use(cors()); // Permite requisições de origens diferentes (ex: frontend em porta diferente)
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// --- Servir Ficheiros Estáticos ---
// Torna a pasta 'public' (e subpastas como 'uploads') acessível via URL
// Ex: http://localhost:3000/uploads/logos/company_logo.png
app.use(express.static(path.join(__dirname, 'public')));


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


// --- Inicia o Servidor ---
// Começa a escutar por conexões na porta definida
app.listen(PORT, async () => {
  console.log(`✅ [SRV-ADM] Servidor iniciado na porta ${PORT}`);
  // Tenta conectar ao DB ao iniciar e loga o resultado
  try {
    const client = await pool.connect();
    console.log("✅ [SRV-ADM] Ligação com o PostgreSQL estabelecida com sucesso!");
    client.release(); // Libera o cliente de volta para o pool
  } catch (error) {
    console.error("❌ [SRV-ADM] ERRO CRÍTICO ao conectar ao PostgreSQL:", error);
    // Poderia encerrar o processo aqui se a conexão for essencial
    // process.exit(1);
  }
});
