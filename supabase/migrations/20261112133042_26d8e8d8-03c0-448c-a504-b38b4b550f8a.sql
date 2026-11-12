-- Completude passa a rodar com as regras de acesso de quem consulta (sem privilégio elevado).
ALTER FUNCTION public.aval_variaveis_status(uuid) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.aval_var_resolve(uuid, uuid, uuid, uuid) TO authenticated;
