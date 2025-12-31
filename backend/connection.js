// Ficheiro: connection.js
// Descrição: Centraliza e valida a conexão com a base de dados PostgreSQL (SRV-ADM)

let pgReconnectInterval = null;
require('dotenv').config();
const { Pool } = require('pg');

// Cria a pool de conexões usando as variáveis de ambiente
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 10,
  idleTimeoutMillis: 30000,
});

// [NOVO] Objeto para monitorizar o estado da conexão
const pgConnectionStatus = {
    connected: false,
    error: null,
};

// Evento: ligação estabelecida
pool.on('connect', () => {
  // Este evento é por cliente, não para a pool inteira. A verificação inicial é mais fiável.
});

// Evento: erro inesperado
pool.on('error', (err) => {
  console.error('❌ [SRV-ADM] Erro inesperado no cliente da base de dados:', err);
  pgConnectionStatus.connected = false;
  pgConnectionStatus.error = err.message;
  // Inicia a tentativa de reconexão se não estiver a decorrer
  if (!pgReconnectInterval) {
      startPgReconnect();
  }
});

/**
 * [NOVO] Verifica e atualiza o esquema da base de dados, adicionando colunas em falta.
 * Esta função é idempotente, ou seja, pode ser executada várias vezes sem causar erros.
 */
async function checkAndUpgradeSchema(client) {
    console.log('🔍 [DB-UPGRADE] A verificar o esquema da base de dados para atualizações...');

    const checkColumn = async (tableName, columnName) => {
        const res = await client.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
        `, [tableName, columnName]);
        return res.rowCount > 0;
    };

    // Colunas a serem adicionadas na tabela 'routers' para a API do MikroTik
    const columnsToAdd = [
        { name: 'username', type: 'VARCHAR(255)' },
        { name: 'password', type: 'VARCHAR(255)' },
        { name: 'api_port', type: 'INTEGER' }
    ];

    for (const col of columnsToAdd) {
        const exists = await checkColumn('routers', col.name);
        if (!exists) {
            console.log(`   -> A coluna '${col.name}' não foi encontrada na tabela 'routers'. A adicionar...`);
            await client.query(`ALTER TABLE routers ADD COLUMN ${col.name} ${col.type}`);
            console.log(`   ✅ Coluna '${col.name}' adicionada com sucesso.`);
        } else {
            // console.log(`   -> Coluna '${col.name}' já existe.`);
        }
    }

    // [NOVO] Garante que todas as permissões do sistema existem na tabela 'permissions'
    // Isto assegura que o Master tenha acesso a tudo (exceto LGPD) e que as permissões apareçam na matriz.
    const systemPermissions = [
        // Principal
        { key: 'dashboard.read', feature: 'Principal: Dashboard', action: 'Visualizar' },
        { key: 'system_health.read', feature: 'Principal: Saúde do Sistema', action: 'Visualizar' },
        { key: 'analytics.read', feature: 'Principal: Dashboard Analítico', action: 'Visualizar' },
        { key: 'hotspot.read', feature: 'Principal: Relatório Hotspot', action: 'Visualizar' },

        // Detalhes do Dashboard Analítico
        { key: 'analytics.details.logins', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Acessos' },
        { key: 'analytics.details.hotspot_users', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Utilizadores Hotspot' },
        { key: 'analytics.details.routers', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Roteadores' },
        { key: 'analytics.details.tickets', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Tickets' },
        { key: 'analytics.details.lgpd', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Pedidos LGPD' },
        { key: 'analytics.details.admin_activity', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Atividade Admin' },
        { key: 'analytics.details.raffles', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Sorteios' },
        { key: 'analytics.details.campaigns', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Campanhas' },
        { key: 'analytics.details.server_health', feature: 'Principal: Dashboard Analítico (Detalhes)', action: 'Ver Detalhes de Saúde do Servidor' },
        
        // Gestão
        { key: 'users.read', feature: 'Gestão: Utilizadores', action: 'Visualizar' },
        { key: 'users.create', feature: 'Gestão: Utilizadores', action: 'Criar' },
        { key: 'users.update', feature: 'Gestão: Utilizadores', action: 'Editar' },
        { key: 'users.delete', feature: 'Gestão: Utilizadores', action: 'Eliminar' },

        { key: 'routers.read', feature: 'Gestão: Roteadores', action: 'Visualizar' },
        { key: 'routers.create', feature: 'Gestão: Roteadores', action: 'Criar' },
        { key: 'routers.update', feature: 'Gestão: Roteadores', action: 'Editar' },
        { key: 'routers.delete', feature: 'Gestão: Roteadores', action: 'Eliminar' },
        { key: 'routers.reboot', feature: 'Gestão: Roteadores', action: 'Reiniciar/Desligar' },
        { key: 'routers.individual.delete_permanent', feature: 'Gestão: Roteadores', action: 'Exclusão Permanente' },
        { key: 'routers.monitoring.read', feature: 'Gestão: Roteadores', action: 'Ver Monitoramento (NOC)' },
        { key: 'routers.dashboard.read', feature: 'Gestão: Roteadores', action: 'Ver Dashboard Individual' },
        { key: 'routers.dashboard.clients', feature: 'Gestão: Roteadores', action: 'Ver Clientes no Dashboard' },
        { key: 'routers.dashboard.interfaces', feature: 'Gestão: Roteadores', action: 'Ver Interfaces no Dashboard' },

        { key: 'tickets.read', feature: 'Gestão: Suporte (Tickets)', action: 'Visualizar' },
        { key: 'tickets.create', feature: 'Gestão: Suporte (Tickets)', action: 'Criar' },
        { key: 'tickets.update', feature: 'Gestão: Suporte (Tickets)', action: 'Editar' },
        { key: 'tickets.manage', feature: 'Gestão: Suporte (Tickets)', action: 'Gerir (Atribuir/Status)' },
        { key: 'tickets.delete', feature: 'Gestão: Suporte (Tickets)', action: 'Eliminar' },

        // Marketing
        { key: 'templates.read', feature: 'Marketing: Templates', action: 'Visualizar' },
        { key: 'templates.create', feature: 'Marketing: Templates', action: 'Criar' },
        { key: 'templates.update', feature: 'Marketing: Templates', action: 'Editar' },
        { key: 'templates.delete', feature: 'Marketing: Templates', action: 'Eliminar' },

        { key: 'campaigns.read', feature: 'Marketing: Campanhas', action: 'Visualizar' },
        { key: 'campaigns.create', feature: 'Marketing: Campanhas', action: 'Criar' },
        { key: 'campaigns.update', feature: 'Marketing: Campanhas', action: 'Editar' },
        { key: 'campaigns.delete', feature: 'Marketing: Campanhas', action: 'Eliminar' },

        { key: 'banners.read', feature: 'Marketing: Banners', action: 'Visualizar' },
        { key: 'banners.create', feature: 'Marketing: Banners', action: 'Criar' },
        { key: 'banners.update', feature: 'Marketing: Banners', action: 'Editar' },
        { key: 'banners.delete', feature: 'Marketing: Banners', action: 'Eliminar' },

        { key: 'raffles.read', feature: 'Marketing: Ferramentas (Sorteios)', action: 'Visualizar' },
        { key: 'raffles.create', feature: 'Marketing: Ferramentas (Sorteios)', action: 'Criar' },
        { key: 'raffles.update', feature: 'Marketing: Ferramentas (Sorteios)', action: 'Editar' },
        { key: 'raffles.draw', feature: 'Marketing: Ferramentas (Sorteios)', action: 'Realizar Sorteio' },
        { key: 'raffles.delete', feature: 'Marketing: Ferramentas (Sorteios)', action: 'Eliminar' },

        // Administração
        { key: 'settings.appearance', feature: 'Administração: Configurações', action: 'Aparência' },
        { key: 'settings.login_page', feature: 'Administração: Configurações', action: 'Página de Login' },
        { key: 'settings.smtp', feature: 'Administração: Configurações', action: 'SMTP (E-mail)' },
        { key: 'settings.policies', feature: 'Administração: Configurações', action: 'Políticas' },
        { key: 'settings.media', feature: 'Administração: Configurações', action: 'Gestão de Arquivos' },
        { key: 'settings.hotspot.read', feature: 'Administração: Configurações', action: 'Ver Configs Hotspot' },
        { key: 'settings.hotspot.update', feature: 'Administração: Configurações', action: 'Editar Configs Hotspot' },

        { key: 'permissions.read', feature: 'Administração: Funções e Permissões', action: 'Visualizar' },
        { key: 'permissions.update', feature: 'Administração: Funções e Permissões', action: 'Editar' },

        { key: 'logs.activity.read', feature: 'Administração: Logs', action: 'Ver Logs de Atividade' },
        { key: 'logs.system.read', feature: 'Administração: Logs', action: 'Ver Logs de Sistema' },

        { key: 'lgpd.read', feature: 'Administração: LGPD', action: 'Visualizar' },
        { key: 'lgpd.update', feature: 'Administração: LGPD', action: 'Editar' },
        { key: 'lgpd.delete', feature: 'Administração: LGPD', action: 'Eliminar' }
    ];

    for (const perm of systemPermissions) {
        // Verifica se a permissão existe
        const permCheck = await client.query('SELECT 1 FROM permissions WHERE permission_key = $1', [perm.key]);
        if (permCheck.rowCount === 0) {
            console.log(`   -> Permissão '${perm.key}' em falta. A adicionar...`);
            await client.query(
                'INSERT INTO permissions (permission_key, feature_name, action_name, description) VALUES ($1, $2, $3, $4)',
                [perm.key, perm.feature, perm.action, `Permissão para ${perm.action} em ${perm.feature}`]
            );
        }
    }

    console.log('✅ [DB-UPGRADE] Verificação do esquema concluída.');
}

const startPgReconnect = () => {
    if (pgReconnectInterval) return; // Já está a tentar

    console.log('🔄 [PG-RECONNECT] A agendar tentativas de reconexão com o PostgreSQL a cada 30 segundos...');
    pgReconnectInterval = setInterval(async () => {
        console.log('🔄 [PG-RECONNECT] A tentar reconectar ao PostgreSQL...');
        try {
            const client = await pool.connect();
            console.log('✅ [PG-RECONNECT] Conexão com o PostgreSQL restabelecida!');
            pgConnectionStatus.connected = true;
            pgConnectionStatus.error = null;
            clearInterval(pgReconnectInterval); // Para as tentativas
            pgReconnectInterval = null;
            await checkAndUpgradeSchema(client); // Verifica o esquema após reconectar
            client.release();
            // Aqui poderíamos emitir um evento para reiniciar serviços dependentes, como o 'startPeriodicRouterCheck'
        } catch (err) {
            console.error('❌ [PG-RECONNECT] Tentativa de reconexão falhou:', err.message);
            pgConnectionStatus.connected = false;
            pgConnectionStatus.error = err.message;
        }
    }, 300000); // Tenta a cada 5 minutos
};

// Função de teste e validação inicial
const testInitialConnection = async () => {
  const startTime = Date.now();
  try {
    const client = await pool.connect();
    const duration = Date.now() - startTime;

    const result = await client.query(`
      SELECT current_database() AS database,
             current_user AS user,
             inet_server_addr() AS host,
             inet_server_port() AS port;
    `);

    const info = result.rows[0];

    console.log('\n🔍 [SRV-ADM] Detalhes da conexão PostgreSQL:');
    console.log(`   🧑 Usuário conectado: ${info.user}`);
    console.log(`   🗃️ Banco de dados:     ${info.database}`);
    console.log(`   🌐 Host:               ${info.host}`);
    console.log(`   🔌 Porta:              ${info.port}`);
    console.log(`   ⚡ Tempo de conexão:   ${duration} ms\n`);

    console.log('✅ [SRV-ADM] Conectado com sucesso no PostgreSQL!\n');

    // [NOVO] Atualiza o status global
    pgConnectionStatus.connected = true;
    pgConnectionStatus.error = null;

    // [NOVO] Executa a verificação e atualização do esquema
    try {
        await checkAndUpgradeSchema(client);
    } catch (schemaError) {
        console.warn('⚠️ [DB-UPGRADE] Aviso: Não foi possível atualizar as colunas automaticamente (permissão negada).');
        console.warn(`   -> Erro: ${schemaError.message}`);
        console.warn('   -> O servidor continuará, mas algumas funcionalidades podem falhar até que o SQL seja executado manualmente.');
    }

    client.release();
    return true; // Retorna sucesso
  } catch (err) {
    console.error('🚨 [SRV-ADM] Falha ao conectar ao PostgreSQL:', err.message);
    pgConnectionStatus.connected = false;
    pgConnectionStatus.error = err.message;
    startPgReconnect(); // Inicia as tentativas de reconexão
    return false; // Retorna falha
  }
};

module.exports = { pool, testInitialConnection, pgConnectionStatus };
