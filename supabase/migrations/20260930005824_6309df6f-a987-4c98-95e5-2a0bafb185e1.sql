REVOKE EXECUTE ON FUNCTION public.cleanup_old_login_attempts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_maintenance_confirmation() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_ticket_status_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.maintenance_tickets_sync_completed_at() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.profiles_audit_privileged_changes() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.trg_limpar_snapshot_on_reabertura() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO service_role;