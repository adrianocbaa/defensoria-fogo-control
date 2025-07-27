-- Primeiro, adicionar o novo valor 'gm' ao enum existente
ALTER TYPE user_role ADD VALUE 'gm';

-- Atualizar registros existentes de 'manutencao' para 'gm'
UPDATE public.profiles 
SET role = 'gm' 
WHERE role = 'manutencao';

-- Criar novo enum sem o valor 'manutencao'
CREATE TYPE user_role_new AS ENUM ('admin', 'editor', 'viewer', 'gm');

-- Atualizar a coluna para usar o novo tipo
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Substituir o tipo antigo
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;