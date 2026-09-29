-- =====================================================================
-- LOTE 4c — VERIFICAÇÃO (SOMENTE LEITURA — não altera nada)
-- Rodar no SQL Editor da produção DEPOIS de lote4c_portal_publico.sql
-- =====================================================================

-- V1) Políticas de leitura anônima nas tabelas do portal
--     Esperado: nucleos_central, hydrants, fire_extinguishers com política
--     "Portal publico leitura ..." para anon; obras/nucleo_module_visibility
--     com suas políticas normais (avaliáveis por anônimo após o reparo).
SELECT tablename AS tabela, policyname AS politica, roles AS papeis
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('obras','nucleos_central','nucleo_module_visibility',
                    'hydrants','fire_extinguishers','documents',
                    'orcamento_items','medicao_sessions','aditivo_sessions','rdo_reports')
  AND cmd IN ('SELECT','ALL')
ORDER BY tablename, policyname;

-- V2) Funções que visitantes anônimos podem executar
--     Esperado: has_role, can_edit, can_edit_obra, is_demo_user,
--     is_fiscal_of_obra, user_has_obra_access, can_view_sensitive_data,
--     is_admin, cleanup_old_login_attempts (quando existirem).
SELECT p.proname AS funcao,
       pg_get_userbyid(p.proowner) AS dono,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anonimo_pode_executar
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('has_role','can_edit','can_edit_obra','is_demo_user',
                    'is_fiscal_of_obra','user_has_obra_access',
                    'can_view_sensitive_data','is_admin','cleanup_old_login_attempts')
ORDER BY p.proname;

-- V3) Modo da visão pública de núcleos
--     Esperado: nuclei_public com security_invoker = false.
SELECT viewname, security_invoker
FROM pg_views
WHERE schemaname = 'public' AND viewname IN ('nuclei_public','nuclei_secure');

-- V4) Permissão de leitura anônima na visão pública
--     Esperado: uma linha com SELECT para nuclei_public.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public' AND table_name LIKE 'nuclei%';
