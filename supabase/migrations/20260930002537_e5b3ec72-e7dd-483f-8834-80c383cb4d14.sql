DROP POLICY IF EXISTS "System can insert status history" ON public.maintenance_ticket_status_history;
DROP POLICY IF EXISTS "Sistema pode inserir notificações" ON public.rdo_notificacoes_enviadas;
REVOKE INSERT, UPDATE, DELETE ON public.maintenance_ticket_status_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rdo_notificacoes_enviadas FROM anon, authenticated;
GRANT ALL ON public.maintenance_ticket_status_history TO service_role;
GRANT ALL ON public.rdo_notificacoes_enviadas TO service_role;