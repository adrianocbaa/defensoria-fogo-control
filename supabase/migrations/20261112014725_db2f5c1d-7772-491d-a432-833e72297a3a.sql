-- Avaliações: reduzir superfície de funções SECURITY DEFINER expostas a usuários logados.
-- aval_is_reader / aval_is_technical só delegam a has_role/user_organization_id (já executáveis);
-- passam a SECURITY INVOKER sem mudar o resultado das políticas.
ALTER FUNCTION public.aval_is_reader(uuid) SECURITY INVOKER;
ALTER FUNCTION public.aval_is_technical(uuid) SECURITY INVOKER;
-- Auxiliar interno, chamado apenas por aval_evaluate_change_impact (SECURITY DEFINER).
REVOKE EXECUTE ON FUNCTION public.aval_variable_in_use(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aval_variable_in_use(uuid) TO service_role;