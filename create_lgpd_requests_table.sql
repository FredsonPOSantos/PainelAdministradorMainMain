-- Ficheiro: create_lgpd_requests_table.sql
-- Descrição: Cria a tabela para armazenar os pedidos de exclusão de dados (LGPD).

CREATE TABLE IF NOT EXISTS data_exclusion_requests (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    request_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed
    completed_by_user_id INT,
    completion_date TIMESTAMPTZ,

    CONSTRAINT fk_completed_by FOREIGN KEY (completed_by_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

COMMENT ON TABLE data_exclusion_requests IS 'Armazena os pedidos de exclusão de dados feitos pelos utilizadores do hotspot, em conformidade com a LGPD.';
