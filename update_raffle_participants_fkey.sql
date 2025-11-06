-- Remove a restrição de chave estrangeira existente
ALTER TABLE raffle_participants DROP CONSTRAINT raffle_participants_user_id_fkey;

-- Adiciona a nova restrição de chave estrangeira referenciando a tabela userdetails
ALTER TABLE raffle_participants ADD CONSTRAINT raffle_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES userdetails(id);
