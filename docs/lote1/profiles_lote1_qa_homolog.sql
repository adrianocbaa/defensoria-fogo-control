-- =====================================================================
-- SiDIF — LOTE 1 — APOIO A TESTES (SOMENTE HOMOLOGAÇÃO)
-- NÃO INCLUIR EM MIGRATION DE PRODUÇÃO.
-- Aplicar apenas no projeto Supabase isolado, após profiles_lote1_v3.sql,
-- e remover com o bloco final antes de qualquer promoção.
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

-- Remoção (executar ao final da homologação):
-- DROP FUNCTION IF EXISTS public.qa_current_role();
