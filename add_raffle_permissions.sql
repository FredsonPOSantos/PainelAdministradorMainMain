-- Adiciona as permissões para o módulo de sorteios
INSERT INTO permissions (permission_key, feature_name, action_name, description) VALUES
('raffles.create', 'Sorteios', 'Criar', 'Permite criar novos sorteios'),
('raffles.read', 'Sorteios', 'Ler', 'Permite visualizar os sorteios'),
('raffles.update', 'Sorteios', 'Atualizar', 'Permite atualizar os sorteios'),
('raffles.delete', 'Sorteios', 'Deletar', 'Permite deletar os sorteios'),
('raffles.draw', 'Sorteios', 'Sortear', 'Permite realizar o sorteio');
