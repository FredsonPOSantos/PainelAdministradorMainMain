// Ficheiro: connection.js
// Descrição: Centraliza e valida a conexão com a base de dados PostgreSQL (SRV-ADM)

let pgReconnectInterval = null;
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

// [NOVO] Flag para garantir que a manutenção só inicia uma vez
let maintenanceIntervalStarted = false;

// [NOVO] Função para registar logs em ficheiro quando a BD está offline
const logOfflineEvent = (type, message, details = null) => {
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, 'offline_events.log');
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, type, message, details }) + '\n';
    
    fs.appendFile(logFile, logEntry, (err) => {
        if (err) console.error('❌ Falha ao escrever no log offline:', err);
    });
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
  logOfflineEvent('DB_ERROR', 'Erro inesperado no cliente da base de dados', err.message); // [NOVO]
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

    // [NOVO] Verifica se a tabela existe
    const checkTable = async (tableName) => {
        const res = await client.query(`
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        return res.rowCount > 0;
    };

    // [NOVO] Correção da tabela 'roles' (Garante que existe e tem a coluna 'slug')
    const rolesExists = await checkTable('roles');
    if (!rolesExists) {
        console.log("   -> Tabela 'roles' não encontrada. Criando...");
        await client.query(`
            CREATE TABLE roles (
                slug VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                is_system BOOLEAN DEFAULT FALSE
            );
        `);
        console.log("   ✅ Tabela 'roles' criada com sucesso.");
    } else {
        const slugExists = await checkColumn('roles', 'slug');
        if (!slugExists) {
            const roleNameExists = await checkColumn('roles', 'role_name');
            if (roleNameExists) {
                console.log("   -> Atualizando tabela 'roles': renomeando 'role_name' para 'slug'...");
                await client.query('ALTER TABLE roles RENAME COLUMN role_name TO slug');
                console.log("   ✅ Coluna 'role_name' renomeada para 'slug'.");
            } else {
                console.log("   -> Adicionando coluna 'slug' à tabela 'roles'...");
                await client.query('ALTER TABLE roles ADD COLUMN slug VARCHAR(50)');
            }
        }

        // [CORREÇÃO] Verifica e adiciona a coluna 'name' se faltar
        const nameExists = await checkColumn('roles', 'name');
        if (!nameExists) {
            console.log("   -> Adicionando coluna 'name' à tabela 'roles'...");
            await client.query('ALTER TABLE roles ADD COLUMN name VARCHAR(100)');
            await client.query("UPDATE roles SET name = slug WHERE name IS NULL"); // Popula com o slug temporariamente
            console.log("   ✅ Coluna 'name' adicionada e populada.");
        }

        // [CORREÇÃO] Verifica e adiciona a coluna 'is_system' se faltar
        const isSystemExists = await checkColumn('roles', 'is_system');
        if (!isSystemExists) {
            console.log("   -> Adicionando coluna 'is_system' à tabela 'roles'...");
            await client.query('ALTER TABLE roles ADD COLUMN is_system BOOLEAN DEFAULT FALSE');
            // Atualiza roles de sistema conhecidas para evitar que sejam deletadas acidentalmente
            await client.query("UPDATE roles SET is_system = true WHERE slug IN ('master', 'gestao', 'estetica', 'DPO')");
            console.log("   ✅ Coluna 'is_system' adicionada.");
        }
    }

    // [NOVO] Garante que a coluna 'role' em 'admin_users' seja VARCHAR e tenha uma chave estrangeira para 'roles'
    const adminUsersExists = await checkTable('admin_users');
    if (adminUsersExists) {
        const roleColumnTypeResult = await client.query(`
            SELECT data_type FROM information_schema.columns 
            WHERE table_name = 'admin_users' AND column_name = 'role'
        `);

        // Se a coluna 'role' não for do tipo 'character varying' (VARCHAR), converte-a.
        // O tipo 'USER-DEFINED' indica um ENUM, que é o que causa o erro.
        if (roleColumnTypeResult.rows.length > 0 && roleColumnTypeResult.rows[0].data_type !== 'character varying') {
            console.log("   -> A converter a coluna 'role' da tabela 'admin_users' de ENUM para VARCHAR...");
            await client.query('ALTER TABLE admin_users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;');
            console.log("   ✅ Coluna 'role' convertida com sucesso.");
        }

        // Verifica se a chave estrangeira já existe
        const fkCheck = await client.query(`
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'admin_users_role_fkey' AND table_name = 'admin_users'
        `);

        if (fkCheck.rowCount === 0) {
            console.log("   -> A adicionar chave estrangeira para 'admin_users.role'...");
            // Adiciona a chave estrangeira referenciando a tabela 'roles'
            // ON UPDATE CASCADE: se o slug em 'roles' mudar, atualiza aqui também.
            // ON DELETE RESTRICT: impede que um perfil seja excluído se ainda estiver em uso.
            await client.query('ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_fkey FOREIGN KEY (role) REFERENCES roles(slug) ON UPDATE CASCADE ON DELETE RESTRICT;');
            console.log("   ✅ Chave estrangeira 'admin_users_role_fkey' adicionada.");
        }
    }

    // [NOVO] Tabela para permissões individuais de utilizadores (Overrides)
    const userPermissionsExists = await checkTable('user_permissions');
    if (!userPermissionsExists) {
        console.log("   -> Tabela 'user_permissions' não encontrada. Criando...");
        await client.query(`
            CREATE TABLE user_permissions (
                user_id INTEGER REFERENCES admin_users(id) ON DELETE CASCADE,
                permission_key VARCHAR(100) NOT NULL,
                is_granted BOOLEAN NOT NULL,
                PRIMARY KEY (user_id, permission_key)
            );
        `);
        console.log("   ✅ Tabela 'user_permissions' criada.");
    }

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

    // [NOVO] Garante que a tabela 'roles' está populada com os perfis de sistema
    // Isto permite que o sistema funcione mesmo se a tabela tiver sido criada vazia
    const systemRoles = [
        { slug: 'master', name: 'Master', description: 'Acesso total ao sistema', is_system: true },
        { slug: 'gestao', name: 'Gestão', description: 'Gestão de roteadores e usuários', is_system: true },
        { slug: 'estetica', name: 'Marketing', description: 'Gestão de campanhas e banners', is_system: true }, // Slug 'estetica' mantido para compatibilidade com dados existentes
        { slug: 'DPO', name: 'DPO', description: 'Encarregado de Proteção de Dados', is_system: true }
    ];

    for (const role of systemRoles) {
        const roleCheck = await client.query('SELECT 1 FROM roles WHERE slug = $1', [role.slug]);
        if (roleCheck.rowCount === 0) {
            console.log(`   -> Perfil de sistema '${role.slug}' em falta. A adicionar...`);
            await client.query(
                'INSERT INTO roles (slug, name, description, is_system) VALUES ($1, $2, $3, $4)',
                [role.slug, role.name, role.description, role.is_system]
            );
        }
    }

    // [NOVO] Verifica e desativa campanhas expiradas (Limpeza na inicialização)
    const campaignsExists = await checkTable('campaigns');
    if (campaignsExists) {
        const result = await client.query(`
            UPDATE campaigns 
            SET is_active = false 
            WHERE is_active = true AND end_date < CURRENT_DATE
        `);
        if (result.rowCount > 0) {
            console.log(`   ✅ [AUTO-CLEANUP] ${result.rowCount} campanhas expiradas foram desativadas.`);
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
            // [CORREÇÃO] Proteção para o cliente de reconexão
            client.on('error', (err) => {
                console.error('❌ [PG-RECONNECT] Erro no cliente de teste:', err.message);
            });

            console.log('✅ [PG-RECONNECT] Conexão com o PostgreSQL restabelecida!');
            logOfflineEvent('RECONNECT_SUCCESS', 'Conexão com o PostgreSQL restabelecida'); // [NOVO]
            pgConnectionStatus.connected = true;
            pgConnectionStatus.error = null;
            clearInterval(pgReconnectInterval); // Para as tentativas
            pgReconnectInterval = null;
            await checkAndUpgradeSchema(client); // Verifica o esquema após reconectar
            client.release();
            // Aqui poderíamos emitir um evento para reiniciar serviços dependentes, como o 'startPeriodicRouterCheck'
        } catch (err) {
            console.error('❌ [PG-RECONNECT] Tentativa de reconexão falhou:', err.message);
            logOfflineEvent('RECONNECT_FAIL', 'Tentativa de reconexão falhou', err.message); // [NOVO]
            pgConnectionStatus.connected = false;
            pgConnectionStatus.error = err.message;
        }
    }, 30000); // Tenta a cada 30 segundos
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

    // [NOVO] Executa sincronização inicial de logins do FreeRADIUS (Correção Imediata)
    try {
        const checkRadacct = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'radacct'");
        if (checkRadacct.rowCount > 0) {
            console.log('🔄 [SYNC] A sincronizar histórico de logins do FreeRADIUS...');
            const syncResult = await client.query(`
                UPDATE userdetails u
                SET ultimo_login = r.last_login
                FROM (
                    SELECT username, MAX(acctstarttime) as last_login
                    FROM radacct
                    GROUP BY username
                ) r
                WHERE u.username = r.username
                AND (u.ultimo_login IS NULL OR u.ultimo_login < r.last_login)
            `);
            console.log(`   ✅ [SYNC] ${syncResult.rowCount} registos de último login atualizados.`);
        }
    } catch (syncError) {
        console.warn('⚠️ [SYNC] Aviso: Falha na sincronização inicial de logins (verifique se o FreeRADIUS está configurado):', syncError.message);
    }

    // [NOVO] Inicia verificação periódica de campanhas (1x por hora)
    if (!maintenanceIntervalStarted) {
        maintenanceIntervalStarted = true;
        console.log('🕒 [MAINTENANCE] Agendada verificação de campanhas expiradas (1h).');
        setInterval(async () => {
            try {
                // Usa uma nova conexão da pool para não interferir
                const client = await pool.connect();
                // [CORREÇÃO] Proteção para o cliente de manutenção
                client.on('error', (err) => {
                    console.error('❌ [MAINTENANCE] Erro no cliente de campanhas:', err.message);
                });
                try {
                    const result = await client.query(`
                        UPDATE campaigns 
                        SET is_active = false 
                        WHERE is_active = true AND end_date < CURRENT_DATE
                    `);
                    if (result.rowCount > 0) {
                        console.log(`[MAINTENANCE] ${result.rowCount} campanhas expiradas foram desativadas.`);
                    }
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error('[MAINTENANCE] Erro ao verificar campanhas:', err.message);
            }
        }, 3600000); // 3600000 ms = 1 hora

        // [NOVO] Tarefas frequentes (5 min) - Sincronização de Logs Hotspot
        console.log('🕒 [MAINTENANCE] Agendada sincronização de logins do FreeRADIUS (5m).');
        setInterval(async () => {
            try {
                const client = await pool.connect();
                // [CORREÇÃO] Proteção para o cliente de manutenção
                client.on('error', (err) => {
                    console.error('❌ [MAINTENANCE] Erro no cliente de logs:', err.message);
                });
                try {
                    // Verifica se a tabela radacct existe
                    const checkRadacct = await client.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'radacct'");
                    
                    if (checkRadacct.rowCount > 0) {
                        // Sincroniza o último login da tabela radacct para userdetails
                        const syncResult = await client.query(`
                            UPDATE userdetails u
                            SET ultimo_login = r.last_login
                            FROM (
                                SELECT username, MAX(acctstarttime) as last_login
                                FROM radacct
                                GROUP BY username
                            ) r
                            WHERE u.username = r.username
                            AND (u.ultimo_login IS NULL OR u.ultimo_login < r.last_login)
                        `);
                        if (syncResult.rowCount > 0) {
                            console.log(`[MAINTENANCE] Sincronizados ${syncResult.rowCount} registos de último login do Hotspot.`);
                        }
                    }
                } finally {
                    client.release();
                }
            } catch (err) {
                console.error('[MAINTENANCE] Erro na sincronização de logins:', err.message);
            }
        }, 300000); // 5 minutos
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

module.exports = { pool, testInitialConnection, pgConnectionStatus, logOfflineEvent, startPgReconnect };
