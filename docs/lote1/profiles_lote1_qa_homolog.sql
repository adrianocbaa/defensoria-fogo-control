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
-- LIMPEZA (obrigatória ao final da homologação, antes de qualquer promoção)
-- ---------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.qa_current_role();
