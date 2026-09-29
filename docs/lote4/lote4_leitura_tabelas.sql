-- LOTE 4 — LEITURA DAS TABELAS (não altera nada)
SELECT
  c.relname AS tabela,
  string_agg(p.privilege_type, ', ' ORDER BY p.privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants p
JOIN pg_class c ON c.relname = p.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE p.grantee = 'anon'
  AND p.table_schema = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname
ORDER BY c.relname;
