// Ficheiro: backend/migration_allow_null.js
const path = require('path');
// [CORREÇÃO] Carrega explicitamente o .env da pasta backend
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando migração de banco de dados...");
    try {
        const client = await pool.connect();
        try {
            console.log("🛠️ Alterando tabela 'ticket_messages' para permitir user_id NULO...");
            await client.query('ALTER TABLE ticket_messages ALTER COLUMN user_id DROP NOT NULL;');
            console.log("✅ Sucesso! A coluna user_id agora aceita valores nulos.");
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
