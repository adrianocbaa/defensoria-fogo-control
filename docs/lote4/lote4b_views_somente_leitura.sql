-- LOTE 4B — Visões (views): visitante fica SOMENTE com leitura.
-- A leitura é mantida para não quebrar o portal público; gravação/exclusão são removidas.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon', t.relname);
  END LOOP;
END $$;

-- Verificação: tudo deve aparecer apenas com SELECT.
SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios_anon
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name ORDER BY table_name;
