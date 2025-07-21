-- Converter todos os valores 'user' para 'viewer' para compatibilidade
UPDATE public.profiles 
SET role = 'viewer' 
WHERE role = 'user';

-- Alterar a coluna para usar o enum user_role
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Definir o novo valor padrão
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'viewer'::user_role;

-- Garantir que o primeiro usuário seja admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);