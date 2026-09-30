-- Lote 9 — Revogar leitura anônima (anon) de 9 consultas internas não usadas por páginas públicas
-- Data: 30/09/2026
-- Mantém intencionalmente: public.nuclei_public (usado pela página pública de detalhes dos preventivos)
-- Não afeta usuários logados (authenticated) nem o PDF do RDO (acesso interno/service_role).

REVOKE SELECT ON public.nuclei_secure FROM anon;
REVOKE SELECT ON public.vw_nucleos_public FROM anon;
REVOKE SELECT ON public.medicao_acumulado_por_item FROM anon;
REVOKE SELECT ON public.medicao_contrato_atual_por_item FROM anon;
REVOKE SELECT ON public.vw_planilha_hierarquia FROM anon;
REVOKE SELECT ON public.nucleos_central_public FROM anon;
REVOKE SELECT ON public.profiles_secure FROM anon;
REVOKE SELECT ON public.orcamento_items_hierarquia FROM anon;
REVOKE SELECT ON public.rdo_activities_acumulado FROM anon;

-- Verificação (rode depois de aplicar):
-- SELECT c.relname,
--        has_table_privilege('anon', c.oid, 'SELECT') AS anon_select
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('nuclei_public','nuclei_secure','vw_nucleos_public',
--                     'medicao_acumulado_por_item','medicao_contrato_atual_por_item',
--                     'vw_planilha_hierarquia','nucleos_central_public','profiles_secure',
--                     'orcamento_items_hierarquia','rdo_activities_acumulado')
-- ORDER BY c.relname;
-- Esperado: apenas nuclei_public com anon_select = true.

-- Rollback (restaurar, se necessário):
-- GRANT SELECT ON public.nuclei_secure TO anon;
-- GRANT SELECT ON public.vw_nucleos_public TO anon;
-- GRANT SELECT ON public.medicao_acumulado_por_item TO anon;
-- GRANT SELECT ON public.medicao_contrato_atual_por_item TO anon;
-- GRANT SELECT ON public.vw_planilha_hierarquia TO anon;
-- GRANT SELECT ON public.nucleos_central_public TO anon;
-- GRANT SELECT ON public.profiles_secure TO anon;
-- GRANT SELECT ON public.orcamento_items_hierarquia TO anon;
-- GRANT SELECT ON public.rdo_activities_acumulado TO anon;
