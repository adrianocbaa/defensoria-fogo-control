-- Corrigir warnings de segurança das funções

-- Corrigir as funções que têm search_path mutable
-- Função 1: cleanup_old_login_attempts
DROP FUNCTION IF EXISTS public.cleanup_old_login_attempts();

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts 
  WHERE attempt_time < now() - interval '24 hours';
$$;

-- Função 2: log_login_attempt  
DROP FUNCTION IF EXISTS public.log_login_attempt(text, boolean, text, inet);

CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_identifier text,
  p_success boolean,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.login_attempts (user_identifier, success, user_agent, ip_address)
  VALUES (p_identifier, p_success, p_user_agent, p_ip_address);
$$;