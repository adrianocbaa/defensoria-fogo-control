-- LOTE 4 — FECHAR A PORTA DOS VISITANTES ANÔNIMOS
-- Remove TODOS os privilégios do papel anon sobre as tabelas do schema public,
-- EXCETO as tabelas usadas pelo portal público de transparência (/public/...).
-- Usuários logados (authenticated) não são afetados.
-- Reversão: docs/lote4/lote4_rollback_anon.sql

DO $$
DECLARE
  t record;
  -- Tabelas que o portal público (/public/...) precisa continuar lendo sem login:
  whitelist text[] := ARRAY[
    'obras',
    'nucleos_central',
    'nucleo_module_visibility',
    'rdo_reports',
    'orcamento_items',
    'medicao_sessions',
    'aditivo_sessions',
    'hydrants',
    'fire_extinguishers',
    'documents'
  ];
BEGIN
  FOR t IN
    SELECT c.relname AS tabela
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'                       -- somente tabelas
      AND c.relname <> ALL (whitelist)
      AND has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.tabela);
  END LOOP;
END $$;

-- Garante que as tabelas do portal público continuam com leitura anônima
-- (não altera nada se já estiver correto):
-- Nas 10 tabelas do portal, o visitante fica SOMENTE com leitura (sem gravar/apagar):
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['obras','nucleos_central','nucleo_module_visibility','rdo_reports','orcamento_items','medicao_sessions','aditivo_sessions','hydrants','fire_extinguishers','documents'] LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon', t);
  END LOOP;
END $$;

GRANT SELECT ON public.obras TO anon;
GRANT SELECT ON public.nucleos_central TO anon;
GRANT SELECT ON public.nucleo_module_visibility TO anon;
GRANT SELECT ON public.rdo_reports TO anon;
GRANT SELECT ON public.orcamento_items TO anon;
GRANT SELECT ON public.medicao_sessions TO anon;
GRANT SELECT ON public.aditivo_sessions TO anon;
GRANT SELECT ON public.hydrants TO anon;
GRANT SELECT ON public.fire_extinguishers TO anon;
GRANT SELECT ON public.documents TO anon;

-- Verificação imediata: deve listar APENAS as 10 tabelas acima.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
