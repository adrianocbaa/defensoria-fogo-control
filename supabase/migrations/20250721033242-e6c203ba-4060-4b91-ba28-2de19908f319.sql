-- Remover a constraint atual que está limitando os valores
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

-- Converter todos os valores 'user' para 'viewer'
UPDATE public.profiles 
SET role = 'viewer' 
WHERE role = 'user';

-- Remover o valor padrão atual 
ALTER TABLE public.profiles 
ALTER COLUMN role DROP DEFAULT;

-- Alterar o tipo da coluna para usar o enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role = 'admin' THEN 'admin'::user_role
    WHEN role = 'editor' THEN 'editor'::user_role
    ELSE 'viewer'::user_role
  END;

-- Definir o novo valor padrão
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'viewer'::user_role;

-- Garantir que o primeiro usuário seja admin
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE user_id = (
  SELECT user_id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);