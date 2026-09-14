-- =====================================================================
-- SiDIF — EXTRAÇÃO DAS DEFINIÇÕES DE AUTORIZAÇÃO (SOMENTE LEITURA)
--
-- Objetivo: obter as definições reais que faltam para completar o
-- bloco 7 de docs/lote1/homolog_base_schema.sql.
--
-- Todas as consultas abaixo são de LEITURA ao catálogo. Nenhuma altera
-- dados, estrutura, policies, grants ou configuração.
-- Nenhuma delas retorna dado institucional, usuário real ou segredo.
--
-- Execute no SQL Editor do projeto ATUAL do SiDIF e copie o resultado.
-- =====================================================================

-- E1 — Definição completa de public.has_role e public.is_admin.
SELECT p.proname,
       pg_get_functiondef(p.oid) AS definicao
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('has_role', 'is_admin')
 ORDER BY p.proname;

-- E2 — Estrutura da tabela public.user_roles.
SELECT column_name, data_type, udt_name, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'user_roles'
 ORDER BY ordinal_position;

-- E3 — Chaves e restrições de public.user_roles.
SELECT conname, pg_get_constraintdef(oid) AS definicao
  FROM pg_constraint
 WHERE conrelid = 'public.user_roles'::regclass
 ORDER BY conname;

-- E4 — RLS, grants e policies de public.user_roles.
SELECT relrowsecurity, relforcerowsecurity
  FROM pg_class WHERE oid = 'public.user_roles'::regclass;

SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public' AND table_name = 'user_roles'
 GROUP BY grantee ORDER BY grantee;

SELECT policyname, cmd, roles, qual AS using_expr, with_check
  FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'user_roles'
 ORDER BY cmd, policyname;

-- E5 — Grants de EXECUTE sobre has_role e is_admin.
SELECT p.proname, r.rolname AS proprietario, p.prosecdef, p.proconfig, p.proacl
  FROM pg_proc p
  JOIN pg_roles r ON r.oid = p.proowner
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('has_role', 'is_admin');
