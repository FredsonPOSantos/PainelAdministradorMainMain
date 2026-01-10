const { Pool } = require('pg');
require('dotenv').config(); // Tenta carregar do .env se existir

// Configuração direta com as credenciais fornecidas como fallback
const dbConfig = {
    host: process.env.DB_HOST || '10.0.0.45',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Rota1010', // Fallback para a senha fornecida
    database: process.env.DB_DATABASE || 'radius'
};

// Garante que a senha é uma string (correção para o erro SASL)
if (dbConfig.password === undefined || dbConfig.password === null) {
    dbConfig.password = '';
} else {
    dbConfig.password = String(dbConfig.password);
}

const pool = new Pool(dbConfig);

async function runMigration() {
    console.log(`⏳ A conectar ao banco de dados em ${dbConfig.host}...`);

    try {
        // Executa o comando SQL para adicionar a coluna se ela não existir
        await pool.query(`
            ALTER TABLE system_settings 
            ADD COLUMN IF NOT EXISTS admin_session_timeout INTEGER DEFAULT 30;
        `);

        console.log("✅ Sucesso! A coluna 'admin_session_timeout' foi adicionada (ou já existia).");
    } catch (error) {
        console.error("❌ Erro ao executar o comando SQL:", error.message);
    } finally {
        // Fecha a conexão com o banco de dados para encerrar o script
        await pool.end();
        console.log("👋 Conexão encerrada.");
    }
}

runMigration();
