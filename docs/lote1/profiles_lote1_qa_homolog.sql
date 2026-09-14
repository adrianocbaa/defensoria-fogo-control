-- =====================================================================
-- SiDIF — LOTE 1 — APOIO A TESTES (SOMENTE HOMOLOGAÇÃO)
-- NÃO INCLUIR EM MIGRATION DE PRODUÇÃO.
-- Aplicar apenas no projeto Supabase isolado, após profiles_lote1_v3.sql,
-- e remover com o bloco final antes de qualquer promoção.
--
-- Pré-requisito do projeto de homologação: deve existir o trigger em
-- auth.users que chama public.handle_new_user(); sem ele os perfis não
-- são criados e a suíte falha já no setup (ver consulta V6 abaixo).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.qa_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$ SELECT current_user::text $$;

COMMENT ON FUNCTION public.qa_current_role() IS
  'SOMENTE HOMOLOGAÇÃO — expõe current_user para provar que usuário comum executa como authenticated e não cai no ramo de serviço da guarda.';

GRANT EXECUTE ON FUNCTION public.qa_current_role() TO authenticated, anon;

-- ---------------------------------------------------------------------
-- LIMPEZA AUTOMÁTICA — chamada pelo teardown da suíte de testes
-- (tests/homolog/profiles_lote1_test.ts) dentro do bloco finally.
-- Remove qa_current_role() e a si mesma, para que nenhum artefato de
-- homologação permaneça mesmo se a suíte falhar em qualquer teste.
-- Executável APENAS por service_role (o cliente de serviço da suíte).
-- SECURITY DEFINER é necessário porque DDL não é permitido via PostgREST;
-- a função NÃO participa de autorização — apenas executa os dois DROPs.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qa_teardown()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'qa_teardown: executável apenas por service_role'
      USING ERRCODE = '42501';
  END IF;
  EXECUTE 'DROP FUNCTION IF EXISTS public.qa_current_role()';
  -- Autorremoção: o DROP vale após o COMMIT da transação; a execução em
  -- curso não é afetada.
  EXECUTE 'DROP FUNCTION IF EXISTS public.qa_teardown()';
END;
$$;

REVOKE ALL ON FUNCTION public.qa_teardown() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_teardown() TO service_role;

-- ---------------------------------------------------------------------
-- VERIFICAÇÕES PÓS-MIGRATION (executar após profiles_lote1_v3.sql)
-- Nenhuma destas consultas altera estado.
-- ---------------------------------------------------------------------

-- V1 — SECURITY DEFINER/INVOKER e PROPRIETÁRIO EFETIVO das funções do Lote 1.
--      A migration NÃO contém ALTER FUNCTION ... OWNER TO ...; o proprietário
--      é a role que executou a migration. Verificar e DOCUMENTAR o resultado.
--      Esperado: guard prosecdef = false; audit prosecdef = true.
SELECT p.proname,
       p.prosecdef,
       r.rolname AS proprietario_efetivo,
       p.proconfig
  FROM pg_proc p
  JOIN pg_roles r ON r.oid = p.proowner
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('profiles_guard_privileged_columns',
                     'profiles_audit_privileged_changes')
 ORDER BY p.proname;

-- V2 — Existência e configuração dos triggers em public.profiles.
--      Esperado: profiles_guard_privileged_columns_trg (BEFORE INSERT OR UPDATE),
--                profiles_audit_privileged_changes_trg (AFTER UPDATE),
--                update_profiles_updated_at (BEFORE UPDATE) — preexistente.
SELECT tgname,
       tgenabled,
       pg_get_triggerdef(oid) AS definicao
  FROM pg_trigger
 WHERE tgrelid = 'public.profiles'::regclass
   AND NOT tgisinternal
 ORDER BY tgname;

-- V3 — Grants resultantes em public.profiles.
--      Esperado: anon SEM privilégios; authenticated apenas SELECT e UPDATE;
--      service_role com todos.
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name = 'profiles'
 GROUP BY grantee
 ORDER BY grantee;

-- V3b — ACL bruto (confirma ausência total de entrada para anon).
SELECT relacl FROM pg_class WHERE oid = 'public.profiles'::regclass;

-- V4 — Policies finais de public.profiles (USING e WITH CHECK explícitos).
--      Esperado: nenhuma policy de INSERT; policies de UPDATE com WITH CHECK.
SELECT policyname, cmd, roles, qual AS using_expr, with_check
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'profiles'
 ORDER BY cmd, policyname;

-- V5 — Confirma que RLS está habilitada e não é forçada/ignorada.
SELECT relrowsecurity, relforcerowsecurity
  FROM pg_class WHERE oid = 'public.profiles'::regclass;

-- V6 — Trigger de auth.users que chama handle_new_user (pré-requisito).
SELECT tgname, pg_get_triggerdef(oid) AS definicao
  FROM pg_trigger
 WHERE tgrelid = 'auth.users'::regclass
   AND NOT tgisinternal;

-- ---------------------------------------------------------------------
-- LIMPEZA (automática via qa_teardown() no teardown da suíte)
-- Segunda garantia manual, caso a suíte seja interrompida (ex.: Ctrl+C)
-- antes de alcançar o bloco finally:
--   DROP FUNCTION IF EXISTS public.qa_current_role();
--   DROP FUNCTION IF EXISTS public.qa_teardown();
-- ---------------------------------------------------------------------
