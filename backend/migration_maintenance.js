// Ficheiro: backend/migration_maintenance.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando migração: Modo de Manutenção de Roteadores...");
    try {
        const client = await pool.connect();
        try {
            console.log("🛠️ Adicionando coluna 'is_maintenance' na tabela 'routers'...");
            
            await client.query(`
                ALTER TABLE routers 
                ADD COLUMN IF NOT EXISTS is_maintenance BOOLEAN DEFAULT FALSE;
            `);
            
            console.log("✅ Sucesso! Coluna 'is_maintenance' adicionada.");
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