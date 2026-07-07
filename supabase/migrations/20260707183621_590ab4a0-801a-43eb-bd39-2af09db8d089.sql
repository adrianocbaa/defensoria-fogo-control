
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_obra(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_rdo(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_contratada(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_demo_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_fiscal_of_obra(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.obra_is_demo(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_sensitive_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_obra_access(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_changes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_assign_obra_access() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_snapshot_on_bloqueio() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rdo_block_administracao() FROM anon;
REVOKE EXECUTE ON FUNCTION public.snapshot_medicao_items(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ajustar_medicao_congelada(uuid, numeric, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ajustar_medicao_congelada_lote(jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_codes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_login_attempts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_read_notifications() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rdo_progress_by_obra(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rdo_progress_batch(uuid[]) FROM anon;

-- Trigger-only functions: revoke from authenticated too (not called by clients)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_obra_access() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_snapshot_on_bloqueio() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rdo_block_administracao() FROM authenticated;
