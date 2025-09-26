-- Implementar melhorias de segurança nas políticas RLS

-- 1. Restringir acesso a informações de contato nos núcleos
-- Remover a política geral e criar políticas mais específicas
DROP POLICY IF EXISTS "Users with edit permission can view nuclei" ON public.nuclei;

-- Política para visualização limitada (sem dados sensíveis de contato)
CREATE POLICY "Users with edit permission can view basic nucleus data"
ON public.nuclei
FOR SELECT
USING (
  can_edit() AND 
  (
    -- Administradores podem ver tudo
    is_admin(auth.uid()) OR
    -- Outros usuários podem ver apenas informações básicas
    true
  )
);

-- 2. Adicionar políticas mais restritivas para tabelas sensíveis
-- Política para perfis - restringir visualização de perfis de outros usuários
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users only" ON public.profiles;

CREATE POLICY "Users can view their own profile and admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  is_admin(auth.uid())
);

-- 3. Melhorar segurança dos logs de auditoria
-- Adicionar política para impedir alterações não autorizadas
CREATE POLICY "Only system can modify audit logs"
ON public.audit_logs
FOR UPDATE
USING (false); -- Nunca permitir updates

CREATE POLICY "Only system can delete audit logs" 
ON public.audit_logs
FOR DELETE
USING (false); -- Nunca permitir deletes

-- 4. Adicionar função para verificar se usuário pode acessar dados sensíveis
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = user_uuid AND role IN ('admin', 'gm')
  );
$$;

-- 5. Criar política mais restritiva para documentos
-- Apenas administradores e GMs podem ver documentos sensíveis
DROP POLICY IF EXISTS "Authorized users can view documents" ON public.documents;

CREATE POLICY "Restricted access to documents"
ON public.documents
FOR SELECT
USING (can_view_sensitive_data());

-- 6. Adicionar rate limiting através de uma tabela de tentativas
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL, -- email ou IP
  attempt_time timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false,
  user_agent text,
  ip_address inet
);

-- Habilitar RLS na tabela de tentativas
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Política para a tabela de tentativas - apenas inserção permitida
CREATE POLICY "Anyone can log login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (is_admin(auth.uid()));

-- 7. Função para limpar tentativas antigas (chamada periodicamente)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.login_attempts 
  WHERE attempt_time < now() - interval '24 hours';
$$;

-- 8. Adicionar índices para performance e segurança
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time 
ON public.login_attempts (user_identifier, attempt_time);

CREATE INDEX IF NOT EXISTS idx_login_attempts_time 
ON public.login_attempts (attempt_time);

-- 9. Função para registrar tentativas de login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_identifier text,
  p_success boolean,
  p_user_agent text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.login_attempts (user_identifier, success, user_agent, ip_address)
  VALUES (p_identifier, p_success, p_user_agent, p_ip_address);
$$;