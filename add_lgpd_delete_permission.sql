-- Ficheiro: add_lgpd_delete_permission.sql
-- Descrição: Adiciona a permissão de exclusão LGPD e a atribui à função DPO.

-- 1. Adiciona a nova permissão à tabela de permissões
INSERT INTO permissions (permission_key, feature_name, action_name, description)
VALUES ('lgpd.delete', 'Gestão LGPD', 'Eliminar Utilizador', 'Permite eliminar permanentemente um utilizador do hotspot.')
ON CONFLICT (permission_key) DO NOTHING;

-- 2. Atribui a nova permissão à função 'DPO'
INSERT INTO role_permissions (role_name, permission_key)
VALUES ('DPO', 'lgpd.delete')
ON CONFLICT (role_name, permission_key) DO NOTHING;
