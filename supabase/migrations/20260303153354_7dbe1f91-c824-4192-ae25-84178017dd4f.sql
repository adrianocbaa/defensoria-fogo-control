
-- Etapa 3A: Criar usuário demo via auth.users (inserção direta)
-- Nota: A senha é um hash bcrypt de "Demo@Sidif2024!"
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  'de000099-de00-4000-8000-de0000000099',
  '00000000-0000-0000-0000-000000000000',
  'demo@sidif.app',
  crypt('Demo@Sidif2024!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Usuário Demo"}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Criar identidade para o usuário demo
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  'de000099-de00-4000-8000-de0000000099',
  'de000099-de00-4000-8000-de0000000099',
  '{"sub":"de000099-de00-4000-8000-de0000000099","email":"demo@sidif.app"}',
  'email',
  'demo@sidif.app',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Criar perfil do usuário demo
INSERT INTO public.profiles (
  user_id,
  display_name,
  email,
  role,
  is_active
) VALUES (
  'de000099-de00-4000-8000-de0000000099',
  'Usuário Demo',
  'demo@sidif.app',
  'viewer',
  true
) ON CONFLICT (user_id) DO NOTHING;

-- Atribuir role 'demo' ao usuário demo
INSERT INTO public.user_roles (user_id, role)
VALUES ('de000099-de00-4000-8000-de0000000099', 'demo')
ON CONFLICT (user_id, role) DO NOTHING;

-- Etapa 3B: Habilitar extensões pg_cron e pg_net (se ainda não estiverem ativas)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
