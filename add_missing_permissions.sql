-- Adiciona as permissões de aparência que são usadas no código mas não estavam na matriz.

-- 1. Permissão para alterar a aparência do painel principal
INSERT INTO permissions (permission_key, feature_name, action_name, description)
VALUES ('settings.appearance', 'Configurações', 'Alterar Aparência do Painel', 'Permite alterar as cores, fontes e imagem de fundo do painel principal.')
ON CONFLICT (permission_key) DO NOTHING;

-- 2. Permissão para alterar a aparência da página de login
INSERT INTO permissions (permission_key, feature_name, action_name, description)
VALUES ('settings.login_page', 'Configurações', 'Alterar Aparência do Login', 'Permite alterar as cores e o logótipo da página de login.')
ON CONFLICT (permission_key) DO NOTHING;
