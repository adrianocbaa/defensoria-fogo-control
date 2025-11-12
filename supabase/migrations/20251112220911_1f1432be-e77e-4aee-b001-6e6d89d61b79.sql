
-- Inserir role do Luiz Sales na tabela user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES ('833ff347-b538-4b14-b922-f22897797969', 'editor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se há outros usuários com role em profiles mas não em user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role::user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = p.role::user_role
WHERE ur.user_id IS NULL
  AND p.role IS NOT NULL
  AND p.role != 'viewer'
ON CONFLICT (user_id, role) DO NOTHING;
