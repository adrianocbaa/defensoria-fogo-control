
-- 1. audit_logs: restringir INSERT apenas a usuários autenticados
DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "All authenticated users can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. rdo_notificacoes_enviadas: restringir INSERT apenas a usuários autenticados
DROP POLICY IF EXISTS "Sistema pode inserir notificações" ON public.rdo_notificacoes_enviadas;
CREATE POLICY "Sistema pode inserir notificações"
  ON public.rdo_notificacoes_enviadas
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
