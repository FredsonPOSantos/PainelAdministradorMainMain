-- Ficheiro: database/step_4_audit_log.sql
-- Descrição: Cria a tabela para armazenar os logs de auditoria do painel de administração.
-- Este script corresponde à Fase 3.2 do desenvolvimento.

-- Tabela para registar ações importantes realizadas no sistema.
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, -- Data e hora exata do evento
    user_id INT,                                     -- ID do utilizador que realizou a ação (pode ser NULL para ações do sistema)
    user_email VARCHAR(255),                         -- Email do utilizador para fácil identificação
    ip_address VARCHAR(45),                          -- Endereço IP de onde a requisição foi feita
    action VARCHAR(255) NOT NULL,                    -- Ação realizada (ex: 'LOGIN_SUCCESS', 'USER_CREATE', 'SETTINGS_UPDATE')
    status VARCHAR(20) NOT NULL,                     -- Status da ação (ex: 'SUCCESS', 'FAILURE')
    description TEXT,                                -- Descrição humanamente legível do evento
    target_type VARCHAR(100),                        -- Tipo do alvo da ação (ex: 'user', 'settings', 'role')
    target_id VARCHAR(100),                          -- ID do alvo (ex: ID do utilizador modificado, nome da configuração)
    details JSONB,                                   -- Detalhes adicionais em formato JSON (ex: dados alterados)

    -- Chave estrangeira opcional para a tabela de utilizadores.
    -- Se um utilizador for eliminado, o log permanece, mas a referência fica nula.
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

COMMENT ON TABLE audit_logs IS 'Regista eventos de auditoria importantes no sistema para rastreabilidade e segurança.';
COMMENT ON COLUMN audit_logs.status IS 'Indica o resultado da ação, como SUCESSO ou FALHA.';
COMMENT ON COLUMN audit_logs.description IS 'Sumário legível do que aconteceu. Ex: "Utilizador master@admin.com atualizou o utilizador user@test.com".';
COMMENT ON COLUMN audit_logs.details IS 'Armazena um JSON com detalhes da ação, como valores antigos e novos, para uma auditoria profunda.';