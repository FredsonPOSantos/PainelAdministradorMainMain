// Ficheiro: connection.js
// Descrição: Centraliza e valida a conexão com a base de dados PostgreSQL (SRV-ADM)

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

// Evento: ligação estabelecida
pool.on('connect', () => {
  console.log('✅ [SRV-ADM] Ligação com o PostgreSQL estabelecida com sucesso!');
});

// Evento: erro inesperado
pool.on('error', (err) => {
  console.error('❌ [SRV-ADM] Erro inesperado no cliente da base de dados:', err);
  process.exit(-1);
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
    console.log('✅ [DB-UPGRADE] Verificação do esquema concluída.');
}

// Teste e validação detalhada da conexão
(async () => {
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

    // [NOVO] Executa a verificação e atualização do esquema
    try {
        await checkAndUpgradeSchema(client);
    } catch (schemaError) {
        console.warn('⚠️ [DB-UPGRADE] Aviso: Não foi possível atualizar as colunas automaticamente (permissão negada).');
        console.warn(`   -> Erro: ${schemaError.message}`);
        console.warn('   -> O servidor iniciará, mas a função de Reiniciar Roteador pode falhar até que o SQL seja executado manualmente.');
    }

    client.release();
  } catch (err) {
    console.error('🚨 [SRV-ADM] Falha ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
