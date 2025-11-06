-- Concede permissões para o usuário radius nas novas tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE raffles TO radius;
GRANT USAGE, SELECT ON SEQUENCE raffles_id_seq TO radius;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE raffle_participants TO radius;
GRANT USAGE, SELECT ON SEQUENCE raffle_participants_id_seq TO radius;

-- Adiciona permissões na tabela userdetails para o usuário radius
GRANT SELECT, UPDATE ON TABLE userdetails TO radius;
