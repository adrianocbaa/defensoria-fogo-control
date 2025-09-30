-- Fix permissions for secure views and promote specified user to admin
BEGIN;

-- Ensure authenticated can read base tables (RLS still applies)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.nuclei TO authenticated;

-- Promote the requested user to admin
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'adriano.eng.mt@gmail.com';

COMMIT;