
-- Corrigir papel do usuário demo: deve ser 'demo', não 'editor'
UPDATE public.user_roles 
SET role = 'demo'
WHERE user_id = 'de000099-de00-4000-8000-de0000000099';

-- Sincronizar profiles.role também
UPDATE public.profiles 
SET role = 'demo'
WHERE user_id = 'de000099-de00-4000-8000-de0000000099';

-- Garantir que o demo tem acesso explícito apenas à obra demo
DELETE FROM public.user_obra_access 
WHERE user_id = 'de000099-de00-4000-8000-de0000000099';

INSERT INTO public.user_obra_access (user_id, obra_id)
VALUES ('de000099-de00-4000-8000-de0000000099', 'de000002-de00-4000-8000-de0000000002')
ON CONFLICT (user_id, obra_id) DO NOTHING;

-- Garantir que fiscal_id da obra demo NÃO é o usuário demo (para evitar que ele veja obras de produção via is_fiscal_of_obra)
-- O fiscal da obra demo deve ser o próprio usuário demo apenas para a obra demo
UPDATE public.obras 
SET fiscal_id = 'de000099-de00-4000-8000-de0000000099'
WHERE id = 'de000002-de00-4000-8000-de0000000002' AND is_demo = true;
