// Ficheiro: backend/controllers/permissionsController.js
// [VERSÃO 13.5.3 - GESTÃO BATCH]
// Lógica para buscar matriz completa e salvar em lote (Batch).

const pool = require('../connection');

/**
 * [ATUALIZADO V13.5.3]
 * Busca e formata os dados para a Matriz de Permissões (Modo Gestão).
 * Retorna um JSON no formato esperado pelo frontend V13.5.3:
 * {
 * roles: ['master', 'gestao', ...],
 * permissions: [ { permission_key: '...', feature_name: '...', action_name: '...' }, ... ],
 * assignments: { 
 * 'master': { 'permission.key': true, ... },
 * 'gestao': { 'permission.key': false, ... }
 * }
 * }
 */
const getPermissionsMatrix = async (req, res) => {
    console.log("getPermissionsMatrix (V13.5.3 - Batch Mode): Buscando dados...");
    try {
        // 1. Buscar todas as roles (exceto 'master' da edição, mas incluímos para DPO ver)
        const rolesResult = await pool.query('SELECT role_name FROM roles ORDER BY role_name');
        const roles = rolesResult.rows.map(r => r.role_name);
        console.log("Roles encontradas:", roles);

        // 2. Buscar todas as permissões disponíveis (agrupadas por feature_name para facilitar)
        const permissionsResult = await pool.query(`
            SELECT permission_key, feature_name, action_name, description
            FROM permissions
            ORDER BY feature_name, action_name
        `);
        const allPermissions = permissionsResult.rows;
        console.log(`Total de ${allPermissions.length} permissões encontradas.`);

        // 3. Buscar todas as associações role <-> permission
        const rolePermissionsResult = await pool.query('SELECT role_name, permission_key FROM role_permissions');
        
        // 4. Montar o objeto 'assignments' para consulta rápida no frontend
        const assignments = {};
        // Inicializa o objeto para todas as roles
        roles.forEach(roleName => {
            assignments[roleName] = {};
            // Inicializa todas as permissões como 'false' para esta role
            allPermissions.forEach(perm => {
                 assignments[roleName][perm.permission_key] = false;
            });
        });
        
        // Preenche com 'true' onde a associação existir
        rolePermissionsResult.rows.forEach(rp => {
            if (assignments[rp.role_name]) {
                assignments[rp.role_name][rp.permission_key] = true;
            }
        });

        console.log("Matriz de atribuições montada.");
        
        res.json({
            roles: roles,
            permissions: allPermissions,
            assignments: assignments
        });

    } catch (error) {
        console.error('Erro ao buscar matriz de permissões (Modo Gestão):', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar permissões.' });
    }
};


/**
 * [NOVO V13.5.3]
 * Recebe um array de alterações de permissões e as aplica no banco de dados
 * dentro de uma única transação.
 * Espera req.body = { changes: [ { role: '...', permission: '...', checked: true/false }, ... ] }
 */
const updatePermissionsBatch = async (req, res) => {
    const { changes } = req.body;
    
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return res.status(400).json({ message: 'Nenhuma alteração fornecida.' });
    }

    console.log(`updatePermissionsBatch (V13.5.3): Recebendo ${changes.length} alterações...`);

    // Usa um 'client' da pool para garantir a transação
    const client = await pool.connect();

    try {
        // Inicia a transação
        await client.query('BEGIN');
        
        // Itera por todas as alterações recebidas
        for (const change of changes) {
            const { role, permission, checked } = change;
            
            // Validação de segurança
            if (role === 'master') {
                console.warn(`Tentativa de alterar permissão do 'master' (${permission}) foi bloqueada.`);
                // Pula esta iteração, mas não para a transação
                continue; 
            }
            
            if (checked) {
                // Adicionar permissão (ignora se já existir - ON CONFLICT DO NOTHING)
                await client.query(
                    'INSERT INTO role_permissions (role_name, permission_key) VALUES ($1, $2) ON CONFLICT (role_name, permission_key) DO NOTHING',
                    [role, permission]
                );
            } else {
                // Remover permissão
                await client.query(
                    'DELETE FROM role_permissions WHERE role_name = $1 AND permission_key = $2',
                    [role, permission]
                );
            }
        }
        
        // Se tudo correu bem, 'commita' as alterações
        await client.query('COMMIT');
        
        console.log("updatePermissionsBatch (V13.5.3): Transação concluída com sucesso.");
        res.status(200).json({ message: 'Permissões atualizadas com sucesso!' });

    } catch (error) {
        // Se algo deu errado, faz 'rollback'
        await client.query('ROLLBACK');
        console.error('Erro na transação de atualização de permissões (ROLLBACK):', error);
        res.status(500).json({ message: 'Erro interno ao salvar as alterações.' });
    } finally {
        // Liberta o 'client' de volta para a pool
        client.release();
    }
};


module.exports = {
    getPermissionsMatrix,
    updatePermissionsBatch
};

