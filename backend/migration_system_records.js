// Ficheiro: backend/migration_system_records.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando migração: Proteção de Registos de Sistema (Banners e Templates)...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Adicionar coluna is_system em banners
        console.log("🛠️ Adicionando coluna 'is_system' em 'banners'...");
        await client.query('ALTER TABLE banners ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE');

        // 2. Adicionar coluna is_system em templates
        console.log("🛠️ Adicionando coluna 'is_system' em 'templates'...");
        await client.query('ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE');

        // 3. Marcar Banners Padrão (IDs: 34, 35, 36)
        console.log("🔒 Protegendo banners padrão (IDs: 34, 35, 36)...");
        await client.query('UPDATE banners SET is_system = TRUE WHERE id IN (34, 35, 36)');

        // 4. Marcar Templates Padrão (IDs: 16, 17, 18)
        console.log("🔒 Protegendo templates padrão (IDs: 16, 17, 18)...");
        await client.query('UPDATE templates SET is_system = TRUE WHERE id IN (16, 17, 18)');

        await client.query('COMMIT');
        console.log("✅ Migração concluída com sucesso!");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Erro durante a migração:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();