// Ficheiro: backend/migration_fix_userdetails_created_at.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { pool } = require('./connection');

async function runMigration() {
    console.log("🔄 Iniciando correção: Adicionar/Verificar coluna 'created_at' em 'userdetails'...");
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verifica se a coluna existe
        const checkCol = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='userdetails' AND column_name='created_at'
        `);

        if (checkCol.rowCount === 0) {
            console.log("🛠️ Coluna 'created_at' não encontrada. Tentando criar ou mapear...");
            
            // Verifica se existe 'data_cadastro' para migrar dados (comum em sistemas legados)
            const checkOldCol = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='userdetails' AND column_name='data_cadastro'
            `);

            if (checkOldCol.rowCount > 0) {
                console.log("   -> Encontrada coluna 'data_cadastro'. Criando 'created_at' como cópia...");
                await client.query('ALTER TABLE userdetails ADD COLUMN created_at TIMESTAMP DEFAULT NOW()');
                await client.query('UPDATE userdetails SET created_at = data_cadastro WHERE data_cadastro IS NOT NULL');
            } else {
                console.log("   -> Criando coluna 'created_at' vazia...");
                await client.query('ALTER TABLE userdetails ADD COLUMN created_at TIMESTAMP DEFAULT NOW()');
            }
        } else {
            console.log("✅ Coluna 'created_at' já existe.");
        }

        await client.query('COMMIT');
        console.log("✅ Correção concluída com sucesso!");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Erro durante a migração:", error);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
