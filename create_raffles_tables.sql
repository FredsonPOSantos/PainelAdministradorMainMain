-- Cria a tabela de sorteios (raffles)
CREATE TABLE IF NOT EXISTS raffles (
    id SERIAL PRIMARY KEY,
    raffle_number VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    observation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id INTEGER REFERENCES admin_users(id),
    winner_id INTEGER REFERENCES userdetails(id),
    filters JSONB
);

-- Cria a tabela de participantes dos sorteios (raffle_participants)
CREATE TABLE IF NOT EXISTS raffle_participants (
    id SERIAL PRIMARY KEY,
    raffle_id INTEGER NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES userdetails(id),
    UNIQUE(raffle_id, user_id) -- Garante que um usuário participe apenas uma vez por sorteio
);
