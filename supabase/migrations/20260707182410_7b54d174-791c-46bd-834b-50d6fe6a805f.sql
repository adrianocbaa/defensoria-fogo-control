
-- === View: switch to security_invoker ===
ALTER VIEW public.nuclei_public SET (security_invoker = true);

-- === Functions: fix mutable search_path ===
ALTER FUNCTION public.generate_orcamento_codigo() SET search_path = public;
ALTER FUNCTION public.rdo_block_excesso_quantidade() SET search_path = public;
ALTER FUNCTION public.update_cronograma_updated_at() SET search_path = public;

-- === Revoke EXECUTE from PUBLIC on SECURITY DEFINER functions, re-grant explicitly ===
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_obra(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_rdo(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_contratada(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_demo_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_fiscal_of_obra(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obra_is_demo(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_sensitive_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_obra_access(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_assign_obra_access() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_snapshot_on_bloqueio() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rdo_block_administracao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_medicao_items(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ajustar_medicao_congelada(uuid, numeric, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ajustar_medicao_congelada_lote(jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_reset_codes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_login_attempts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_read_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rdo_progress_by_obra(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rdo_progress_batch(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_login_attempt(text, boolean, text, inet) FROM PUBLIC;

-- Grant to authenticated (RLS helpers + client-callable RPCs)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_obra(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_rdo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_contratada(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_fiscal_of_obra(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obra_is_demo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_sensitive_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_obra_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_medicao_congelada(uuid, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ajustar_medicao_congelada_lote(jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_read_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rdo_progress_by_obra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rdo_progress_batch(uuid[]) TO authenticated;

-- log_login_attempt: called before auth for failed logins, allow anon + authenticated
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text, boolean, text, inet) TO anon, authenticated;

-- Nucleos public view helpers used from public pages: keep obra_is_demo, can_view_sensitive_data usable by anon views? nucleos_public view only exposes columns, so no function needed there.

-- === base_composicoes: restrict SELECT + role-based writes ===
DROP POLICY IF EXISTS "Users can view all base_composicoes" ON public.base_composicoes;
DROP POLICY IF EXISTS "Authenticated users can create base_composicoes" ON public.base_composicoes;
DROP POLICY IF EXISTS "Authenticated users can update base_composicoes" ON public.base_composicoes;
DROP POLICY IF EXISTS "Authenticated users can delete base_composicoes" ON public.base_composicoes;

CREATE POLICY "base_composicoes_select" ON public.base_composicoes
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));
CREATE POLICY "base_composicoes_insert" ON public.base_composicoes
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "base_composicoes_update" ON public.base_composicoes
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "base_composicoes_delete" ON public.base_composicoes
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- === orcamento_itens: restrict SELECT + role-based writes ===
DROP POLICY IF EXISTS "Users can view all orcamento_itens" ON public.orcamento_itens;
DROP POLICY IF EXISTS "Authenticated users can create orcamento_itens" ON public.orcamento_itens;
DROP POLICY IF EXISTS "Authenticated users can update orcamento_itens" ON public.orcamento_itens;
DROP POLICY IF EXISTS "Authenticated users can delete orcamento_itens" ON public.orcamento_itens;

CREATE POLICY "orcamento_itens_select" ON public.orcamento_itens
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));
CREATE POLICY "orcamento_itens_insert" ON public.orcamento_itens
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "orcamento_itens_update" ON public.orcamento_itens
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "orcamento_itens_delete" ON public.orcamento_itens
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- === orcamentos: role-based writes ===
DROP POLICY IF EXISTS "Authenticated users can create orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Authenticated users can update orcamentos" ON public.orcamentos;
DROP POLICY IF EXISTS "Authenticated users can delete orcamentos" ON public.orcamentos;

CREATE POLICY "orcamentos_insert" ON public.orcamentos
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "orcamentos_update" ON public.orcamentos
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "orcamentos_delete" ON public.orcamentos
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- === checklist_ocorrencias: restrict SELECT and writes to authenticated with edit permission ===
DROP POLICY IF EXISTS "checklist_ocorrencias_select" ON public.checklist_ocorrencias;
DROP POLICY IF EXISTS "checklist_ocorrencias_insert" ON public.checklist_ocorrencias;
DROP POLICY IF EXISTS "checklist_ocorrencias_update" ON public.checklist_ocorrencias;
DROP POLICY IF EXISTS "checklist_ocorrencias_delete" ON public.checklist_ocorrencias;

CREATE POLICY "checklist_ocorrencias_select" ON public.checklist_ocorrencias
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));
CREATE POLICY "checklist_ocorrencias_insert" ON public.checklist_ocorrencias
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "checklist_ocorrencias_update" ON public.checklist_ocorrencias
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "checklist_ocorrencias_delete" ON public.checklist_ocorrencias
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- === checklist_pdfs / checklist_servicos / checklist_ambientes: restrict SELECT to can_edit ===
DROP POLICY IF EXISTS "checklist_pdfs_select" ON public.checklist_pdfs;
CREATE POLICY "checklist_pdfs_select" ON public.checklist_pdfs
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "checklist_servicos_select" ON public.checklist_servicos;
CREATE POLICY "checklist_servicos_select" ON public.checklist_servicos
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "checklist_ambientes_select" ON public.checklist_ambientes;
CREATE POLICY "checklist_ambientes_select" ON public.checklist_ambientes
  FOR SELECT TO authenticated USING (public.can_edit(auth.uid()));

-- === hydrants + fire_extinguishers: restrict SELECT to can_edit ===
DROP POLICY IF EXISTS "All authenticated users can view hydrants" ON public.hydrants;
CREATE POLICY "hydrants_select" ON public.hydrants
  FOR SELECT TO authenticated USING (public.can_edit());

DROP POLICY IF EXISTS "All authenticated users can view fire extinguishers" ON public.fire_extinguishers;
CREATE POLICY "fire_extinguishers_select" ON public.fire_extinguishers
  FOR SELECT TO authenticated USING (public.can_edit());

-- === audit_logs: only allow inserts by trusted server contexts (log_changes trigger uses SECURITY DEFINER) ===
DROP POLICY IF EXISTS "All authenticated users can insert audit logs" ON public.audit_logs;
-- SECURITY DEFINER trigger log_changes runs as owner and bypasses RLS; no client insert policy needed.

-- === maintenance_managers / maintenance_types: restrict writes to can_edit ===
DROP POLICY IF EXISTS "Authenticated can insert maintenance managers" ON public.maintenance_managers;
DROP POLICY IF EXISTS "Authenticated can update maintenance managers" ON public.maintenance_managers;
DROP POLICY IF EXISTS "Authenticated can delete maintenance managers" ON public.maintenance_managers;
CREATE POLICY "maintenance_managers_insert" ON public.maintenance_managers
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "maintenance_managers_update" ON public.maintenance_managers
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "maintenance_managers_delete" ON public.maintenance_managers
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can insert maintenance types" ON public.maintenance_types;
DROP POLICY IF EXISTS "Authenticated can update maintenance types" ON public.maintenance_types;
DROP POLICY IF EXISTS "Authenticated can delete maintenance types" ON public.maintenance_types;
CREATE POLICY "maintenance_types_insert" ON public.maintenance_types
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "maintenance_types_update" ON public.maintenance_types
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));
CREATE POLICY "maintenance_types_delete" ON public.maintenance_types
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- login_attempts INSERT keeps the with_check true policy for anon logging via SECURITY DEFINER RPC.
-- Replace it with a more restrictive check: only allow via the log_login_attempt SECURITY DEFINER function.
DROP POLICY IF EXISTS "Anyone can log login attempts" ON public.login_attempts;
-- No direct client insert policy: writes happen only via SECURITY DEFINER function which bypasses RLS.

-- === Storage: drop broad SELECT policies on public buckets (files still reachable via direct public URL) ===
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Fotos dos serviços são visíveis publicamente" ON storage.objects;
DROP POLICY IF EXISTS "Public can view teletrabalho portarias" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all documents" ON storage.objects;
DROP POLICY IF EXISTS "checklist_fotos_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "checklist_pdfs_storage_select" ON storage.objects;
