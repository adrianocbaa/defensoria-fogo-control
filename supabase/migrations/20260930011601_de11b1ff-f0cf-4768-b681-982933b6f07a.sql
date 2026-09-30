DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.cleanup_expired_reset_codes()',
    'public.cleanup_old_read_notifications()',
    'public.snapshot_medicao_items(uuid)',
    'public.enqueue_maintenance_confirmation()',
    'public.log_ticket_status_change()',
    'public.maintenance_tickets_sync_completed_at()',
    'public.profiles_audit_privileged_changes()',
    'public.trg_limpar_snapshot_on_reabertura()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f);
  END LOOP;
END $$;