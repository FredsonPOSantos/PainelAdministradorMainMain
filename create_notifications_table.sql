-- Ficheiro: create_notifications_table.sql
-- Descrição: Cria a tabela para o sistema de notificações.

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE, -- O utilizador que recebe a notificação
    type VARCHAR(50) NOT NULL, -- ex: 'new_ticket', 'new_message', 'ticket_assigned'
    related_ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
    message TEXT NOT NULL, -- A mensagem da notificação, ex: "Novo ticket #123 foi criado."
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Armazena notificações para os utilizadores do painel.';
COMMENT ON COLUMN notifications.user_id IS 'O utilizador que recebe a notificação.';
COMMENT ON COLUMN notifications.related_ticket_id IS 'O ticket associado a esta notificação, se houver.';
COMMENT ON COLUMN notifications.is_read IS 'Indica se o utilizador já visualizou a notificação.';
