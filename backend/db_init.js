// Ficheiro: backend/db_init.js
// Descrição: Script para inicializar o esquema do banco de dados se as tabelas não existirem.

const pool = require('./connection');

const queries = [
    // Tabela de tickets
    `CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_number VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        created_by_user_id INTEGER NOT NULL REFERENCES admin_users(id),
        assigned_to_user_id INTEGER REFERENCES admin_users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    // Tabela de mensagens dos tickets
    `CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES admin_users(id), -- [ATUALIZADO] Permite NULL para mensagens de sistema/IA
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,

    // Tabela de notificações
    `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        related_ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`
];

const initializeDatabase = async () => {
    const client = await pool.connect();
    console.log("[DB_INIT] Conectado ao banco de dados. Iniciando verificação de tabelas...");
    try {
        await client.query(queries[0]);
        console.log("[DB_INIT] Tabela 'tickets' verificada/criada com sucesso.");

        await client.query(queries[1]);
        console.log("[DB_INIT] Tabela 'ticket_messages' verificada/criada com sucesso.");

        await client.query(queries[2]);
        console.log("[DB_INIT] Tabela 'notifications' verificada/criada com sucesso.");

        console.log('Database schema verified and initialized successfully.');
    } catch (error) {
        console.error('[DB_INIT] ERRO DURANTE A INICIALIZAÇÃO DA TABELA:', error);
        throw error; // Lança o erro para que o servidor principal saiba que falhou
    } finally {
        console.log("[DB_INIT] Finalizando e liberando cliente.");
        client.release();
    }
};

module.exports = initializeDatabase;
