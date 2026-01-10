// Ficheiro: backend/migration_permissions_v14.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando atualização da Matriz de Permissões (V14)...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Lista de novas permissões a serem adicionadas
        const newPermissions = [
            // Dashboard
            { key: 'dashboard.read', name: 'Visualizar Dashboard', feature: 'Principal' },
            { key: 'analytics.read', name: 'Visualizar Analítico', feature: 'Principal' },
            { key: 'hotspot.read', name: 'Visualizar Relatório Hotspot', feature: 'Principal' },

            // Relatórios
            { key: 'reports.read', name: 'Visualizar Relatórios', feature: 'Relatórios' },
            
            // Saúde do Sistema
            { key: 'system_health.read', name: 'Visualizar Saúde do Sistema', feature: 'Sistema' },
            
            // Logs
            { key: 'logs.activity.read', name: 'Visualizar Logs de Atividade', feature: 'Logs' },
            { key: 'logs.system.read', name: 'Visualizar Logs de Sistema', feature: 'Logs' },

            // Gestão de Arquivos (Media)
            { key: 'files.read', name: 'Visualizar Arquivos', feature: 'Gestão de Arquivos' },
            { key: 'files.delete', name: 'Excluir Arquivos', feature: 'Gestão de Arquivos' },
            { key: 'files.archive', name: 'Arquivar Anexos Antigos', feature: 'Gestão de Arquivos' },

            // Gestão de Utilizadores
            { key: 'users.read', name: 'Visualizar Utilizadores', feature: 'Utilizadores' },
            { key: 'users.create', name: 'Criar Utilizadores', feature: 'Utilizadores' },
            { key: 'users.update', name: 'Editar Utilizadores', feature: 'Utilizadores' },
            { key: 'users.delete', name: 'Excluir Utilizadores', feature: 'Utilizadores' },

            // Gestão de Perfis (Roles)
            { key: 'roles.read', name: 'Visualizar Perfis', feature: 'Gestão de Perfis' },
            { key: 'roles.create', name: 'Criar Perfis', feature: 'Gestão de Perfis' },
            { key: 'roles.update', name: 'Editar Perfis', feature: 'Gestão de Perfis' },
            { key: 'roles.delete', name: 'Excluir Perfis', feature: 'Gestão de Perfis' },

            // Gestão de Roteadores
            { key: 'routers.read', name: 'Visualizar Roteadores', feature: 'Roteadores' },
            { key: 'routers.create', name: 'Criar Roteadores', feature: 'Roteadores' },
            { key: 'routers.update', name: 'Editar Roteadores', feature: 'Roteadores' },
            { key: 'routers.delete', name: 'Excluir Roteadores', feature: 'Roteadores' },
            { key: 'routers.reboot', name: 'Reiniciar Roteadores', feature: 'Roteadores' },
            { key: 'routers.individual.delete_permanent', name: 'Exclusão Permanente', feature: 'Roteadores' },
            { key: 'routers.monitoring.read', name: 'Visualizar Status em Tempo Real', feature: 'Roteadores' },
            { key: 'routers.dashboard.read', name: 'Visualizar Dashboard Detalhado', feature: 'Roteadores' },
            { key: 'routers.dashboard.clients', name: 'Visualizar Clientes Conectados', feature: 'Roteadores' },
            { key: 'routers.dashboard.interfaces', name: 'Visualizar Tráfego de Interfaces', feature: 'Roteadores' },

            // Suporte (Tickets)
            { key: 'tickets.read', name: 'Visualizar Tickets', feature: 'Suporte' },
            { key: 'tickets.create', name: 'Criar Tickets', feature: 'Suporte' },
            { key: 'tickets.update', name: 'Atualizar Tickets', feature: 'Suporte' },
            { key: 'tickets.delete', name: 'Excluir Tickets', feature: 'Suporte' }, // Geralmente apenas Master
            { key: 'tickets.assign', name: 'Atribuir Tickets', feature: 'Suporte' },
            { key: 'tickets.manage', name: 'Gerir Tickets', feature: 'Suporte' },

            // Configurações
            { key: 'settings.appearance', name: 'Gerir Aparência', feature: 'Configurações' },
            { key: 'settings.login_page', name: 'Gerir Página de Login', feature: 'Configurações' },
            { key: 'settings.smtp', name: 'Gerir SMTP', feature: 'Configurações' },
            { key: 'settings.policies', name: 'Gerir Políticas', feature: 'Configurações' },
            { key: 'settings.media', name: 'Gerir Mídia', feature: 'Configurações' },
            { key: 'settings.hotspot.read', name: 'Ver Configs Hotspot', feature: 'Configurações' },
            { key: 'settings.hotspot.update', name: 'Editar Configs Hotspot', feature: 'Configurações' },
            { key: 'permissions.read', name: 'Ver Permissões', feature: 'Configurações' },
            { key: 'permissions.update', name: 'Editar Permissões', feature: 'Configurações' },

            // Marketing (Campanhas, Banners, Templates, Sorteios)
            { key: 'campaigns.read', name: 'Visualizar Campanhas', feature: 'Marketing' },
            { key: 'campaigns.create', name: 'Criar Campanhas', feature: 'Marketing' },
            { key: 'campaigns.update', name: 'Editar Campanhas', feature: 'Marketing' },
            { key: 'campaigns.delete', name: 'Excluir Campanhas', feature: 'Marketing' },
            
            { key: 'banners.read', name: 'Visualizar Banners', feature: 'Marketing' },
            { key: 'banners.create', name: 'Criar Banners', feature: 'Marketing' },
            { key: 'banners.update', name: 'Editar Banners', feature: 'Marketing' },
            { key: 'banners.delete', name: 'Excluir Banners', feature: 'Marketing' },

            { key: 'templates.read', name: 'Visualizar Templates', feature: 'Marketing' },
            { key: 'templates.create', name: 'Criar Templates', feature: 'Marketing' },
            { key: 'templates.update', name: 'Editar Templates', feature: 'Marketing' },
            { key: 'templates.delete', name: 'Excluir Templates', feature: 'Marketing' },

            { key: 'raffles.read', name: 'Visualizar Sorteios', feature: 'Marketing' },
            { key: 'raffles.create', name: 'Criar Sorteios', feature: 'Marketing' },
            { key: 'raffles.update', name: 'Editar Sorteios', feature: 'Marketing' },
            { key: 'raffles.draw', name: 'Realizar Sorteio', feature: 'Marketing' },
            { key: 'raffles.delete', name: 'Excluir Sorteios', feature: 'Marketing' }
        ];

        for (const perm of newPermissions) {
            // Insere a permissão se não existir
            await client.query(`
                INSERT INTO permissions (permission_key, action_name, feature_name)
                VALUES ($1, $2, $3)
                ON CONFLICT (permission_key) DO UPDATE 
                SET action_name = EXCLUDED.action_name, feature_name = EXCLUDED.feature_name;
            `, [perm.key, perm.name, perm.feature]);
        }

        console.log("✅ Permissões inseridas/atualizadas na tabela 'permissions'.");

        // Atribuir permissões padrão ao perfil 'gestao' (exemplo)
        const gestaoPermissions = [
            'reports.read', 
            'tickets.read', 'tickets.create', 'tickets.update', 'tickets.assign',
            'routers.monitoring.read', 'routers.dashboard.read', 'routers.dashboard.clients'
        ];

        for (const key of gestaoPermissions) {
            await client.query(`
                INSERT INTO role_permissions (role_name, permission_key)
                VALUES ('gestao', $1)
                ON CONFLICT DO NOTHING;
            `, [key]);
        }
        
        console.log("✅ Permissões padrão atribuídas ao perfil 'gestao'.");
        
        // Nota: O perfil 'master' tem acesso total por lógica no código (bypass), 
        // mas se a lógica mudou para ler da tabela, deveríamos inserir aqui também.
        // No authMiddleware atual: "Se for master, concede todas as permissões da tabela 'permissions'".
        // Portanto, apenas inserir na tabela 'permissions' já habilita para o master.

        await client.query('COMMIT');
        console.log("🚀 Migração de permissões concluída com sucesso!");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Erro na migração:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();