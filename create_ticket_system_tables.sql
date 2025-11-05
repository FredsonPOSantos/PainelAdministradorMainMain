-- Ficheiro: create_ticket_system_tables.sql
-- Descrição: Cria as tabelas para o novo sistema de suporte e tickets.

-- Tabela principal para os tickets
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- Exemplos: open, in_progress, closed
    created_by_user_id INTEGER NOT NULL REFERENCES admin_users(id),
    assigned_to_user_id INTEGER REFERENCES admin_users(id), -- Pode ser nulo
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela para as mensagens/respostas de cada ticket
CREATE TABLE IF NOT EXISTS ticket_messages (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES admin_users(id),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Função de gatilho para atualizar o campo 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Gatilho para a tabela 'tickets' (quando o próprio ticket é atualizado)
-- DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets; -- Descomente se precisar recriar
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função de gatilho para atualizar o ticket pai quando uma nova mensagem é adicionada
CREATE OR REPLACE FUNCTION update_ticket_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Gatilho para a tabela 'ticket_messages' (quando uma nova mensagem é inserida)
-- DROP TRIGGER IF EXISTS update_ticket_on_new_message_trigger ON ticket_messages; -- Descomente se precisar recriar
CREATE TRIGGER update_ticket_on_new_message_trigger
    AFTER INSERT ON ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_on_new_message();

-- Adiciona comentários para clareza
COMMENT ON TABLE tickets IS 'Armazena os tickets de suporte.';
COMMENT ON COLUMN tickets.status IS 'Status atual do ticket (ex: open, in_progress, closed).';
COMMENT ON TABLE ticket_messages IS 'Armazena a trilha de conversa para cada ticket.';

-- Tabela para avaliações dos tickets
CREATE TABLE IF NOT EXISTS ticket_ratings (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES admin_users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(ticket_id) -- Garante que cada ticket só pode ser avaliado uma vez
);

COMMENT ON TABLE ticket_ratings IS 'Armazena as avaliações dos tickets de suporte.';
COMMENT ON COLUMN ticket_ratings.rating IS 'A avaliação dada pelo utilizador, de 1 a 5 estrelas.';
