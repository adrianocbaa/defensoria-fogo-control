REVOKE EXECUTE ON FUNCTION public.aval_laudo_capa_efetiva(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_midias_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aval_guard_laudo_midias() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_capa_salvar(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_migrar_modelo(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_section_visibility(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aval_laudo_snapshot(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.aval_tokens(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aval_laudo_capa_salvar(uuid, jsonb), public.aval_laudo_migrar_modelo(uuid), public.aval_laudo_section_visibility(uuid, boolean),
  public.aval_laudo_snapshot(uuid), public.aval_tokens(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aval_laudo_capa_efetiva(uuid) TO service_role;