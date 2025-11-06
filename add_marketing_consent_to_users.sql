-- Adiciona a coluna para consentimento de marketing na tabela de usuários do hotspot
ALTER TABLE userdetails ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN DEFAULT false;
