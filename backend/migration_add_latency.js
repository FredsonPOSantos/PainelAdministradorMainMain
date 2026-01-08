// Ficheiro: backend/migration_add_latency.js
const path = require('path');
// Carrega explicitamente o .env da pasta backend
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando migração de banco de dados (Adicionar Latência)...");
    try {
        const client = await pool.connect();
        try {
            console.log("🛠️ Verificando/Adicionando coluna 'latency' na tabela 'routers'...");
            
            // Adiciona a coluna latency se não existir
            await client.query(`
                ALTER TABLE routers 
                ADD COLUMN IF NOT EXISTS latency INTEGER;
            `);
            
            console.log("✅ Sucesso! A coluna 'latency' foi verificada/adicionada.");
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("❌ Erro durante a migração:", error.message);
    } finally {
        await pool.end();
    }
}

runMigration();