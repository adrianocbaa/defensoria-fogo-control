-- Atualizar registros existentes de 'manutencao' para 'gm'
UPDATE public.profiles 
SET role = 'gm' 
WHERE role = 'manutencao';

-- Remover o valor antigo e adicionar o novo ao enum
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer', 'gm');

-- Atualizar a coluna para usar o novo tipo
ALTER TABLE public.profiles 
ALTER COLUMN role DROP DEFAULT,
ALTER COLUMN role TYPE user_role USING role::text::user_role,
ALTER COLUMN role SET DEFAULT 'viewer'::user_role;

-- Remover o tipo antigo
DROP TYPE user_role_old;