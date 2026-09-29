-- LOTE 4 — REVERSÃO (desfaz a correção)
-- Devolve ao papel anon os mesmos privilégios amplos que existiam antes
-- (SELECT, INSERT, UPDATE, DELETE em todas as tabelas do schema public),
-- reproduzindo o estado anterior à correção.
-- Use somente se algo quebrar após aplicar lote4_revogar_anon.sql.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tabela
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon', t.tabela);
  END LOOP;
END $$;

-- Verificação: deve listar todas as tabelas com os 4 privilégios.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
