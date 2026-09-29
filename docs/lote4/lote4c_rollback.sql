-- =====================================================================
-- LOTE 4c — REVERSÃO (desfaz o reparo do portal público em minutos)
-- =====================================================================
-- Efeito da reversão: as páginas públicas voltam a falhar para visitantes
-- anônimos (estado anterior ao reparo). Nenhum dado é alterado.
-- O Lote 4 original (tabelas fechadas) NÃO é revertido por este arquivo.

-- 1) Tira de visitantes anônimos o direito de executar as funções
DO $$
DECLARE
  fn text;
  funcs text[] := ARRAY[
    'public.has_role(uuid, public.user_role)',
    'public.can_edit(uuid)',
    'public.can_edit_obra(uuid, uuid)',
    'public.is_demo_user(uuid)',
    'public.is_fiscal_of_obra(uuid, uuid)',
    'public.user_has_obra_access(uuid, uuid)',
    'public.can_view_sensitive_data(uuid)',
    'public.is_admin(uuid)',
    'public.cleanup_old_login_attempts()'
  ];
BEGIN
  FOREACH fn IN ARRAY funcs LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 2) Remove as políticas de leitura anônima criadas pelo reparo
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'Portal publico leitura %'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3) Volta a visão pública ao modo anterior e fecha a leitura anônima dela
ALTER VIEW public.nuclei_public SET (security_invoker = true);
REVOKE SELECT ON public.nuclei_public FROM anon;

-- 4) Conferência: deve voltar a listar apenas as 10 tabelas do portal
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
