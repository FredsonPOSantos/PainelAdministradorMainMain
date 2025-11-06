-- Remove a restrição de chave estrangeira existente
ALTER TABLE raffles DROP CONSTRAINT raffles_winner_id_fkey;

-- Adiciona a nova restrição de chave estrangeira referenciando a tabela userdetails
ALTER TABLE raffles ADD CONSTRAINT raffles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES userdetails(id);
