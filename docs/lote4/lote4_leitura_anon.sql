-- LOTE 4 — LEITURA (não altera nada)
-- Lista quais tabelas do schema public hoje concedem algum privilégio ao papel anon.
-- Rode no SQL Editor da produção e cole o resultado no chat.

SELECT
  c.relname AS tabela,
  string_agg(p.privilege_type, ', ' ORDER BY p.privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants p
JOIN pg_class c ON c.relname = p.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE p.grantee = 'anon'
  AND p.table_schema = 'public'
  AND c.relkind = 'r'          -- somente tabelas (views ficam de fora)
GROUP BY c.relname
ORDER BY c.relname;

-- Funções executáveis por anon (para referência):
SELECT p.proname AS funcao
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY p.proname;
