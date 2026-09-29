-- PREFLIGHT CONSOLIDADO (somente leitura): todas as verificações C0-C9 + RESUMO em UMA tabela.
-- Gerado a partir de profiles_lote1_preflight_homolog.sql. Nenhum objeto é criado ou alterado.
SELECT 1 AS ordem, t0.resultado::text AS resultado, t0.verificacao::text AS verificacao FROM (
SELECT CASE
         WHEN current_setting('app.settings.project_ref', true) LIKE '%mmumfgxngzaivvyqfbed%'
           THEN 'FALHA'
         ELSE 'OK'
       END AS resultado,
       'C0 - Banco não é produção (confirmar ref no painel)' AS verificacao,
       current_database() AS banco,
       inet_server_addr()::text AS servidor
) t0
UNION ALL
SELECT 2 AS ordem, t1.resultado::text AS resultado, t1.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regclass('public.profiles') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.1 - Tabela public.profiles existe' AS verificacao
) t1
UNION ALL
SELECT 3 AS ordem, t2.resultado::text AS resultado, t2.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regclass('public.user_roles') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.2 - Tabela public.user_roles existe' AS verificacao
) t2
UNION ALL
SELECT 4 AS ordem, t3.resultado::text AS resultado, t3.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regclass('public.audit_logs') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.3 - Tabela public.audit_logs existe' AS verificacao
) t3
UNION ALL
SELECT 5 AS ordem, t4.resultado::text AS resultado, t4.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regclass('auth.users') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.4 - Tabela auth.users existe' AS verificacao
) t4
UNION ALL
SELECT 6 AS ordem, t5.resultado::text AS resultado, t5.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regtype('public.user_role') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '2.1 - Tipo public.user_role existe' AS verificacao
) t5
UNION ALL
SELECT 7 AS ordem, t6.resultado::text AS resultado, t6.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regtype('public.sector_type') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '2.2 - Tipo public.sector_type existe' AS verificacao
) t6
UNION ALL
SELECT 8 AS ordem, t7.resultado::text AS resultado, t7.verificacao::text AS verificacao FROM (
WITH esperadas(col, dtype) AS (
  VALUES
    ('id',                          'uuid'),
    ('user_id',                     'uuid'),
    ('created_at',                  'timestamp with time zone'),
    ('updated_at',                  'timestamp with time zone'),
    ('display_name',                'text'),
    ('email',                       'text'),
    ('role',                        'user_role'),
    ('is_active',                   'boolean'),
    ('is_maintenance_responsible',  'boolean'),
    ('force_password_change',       'boolean'),
    ('empresa_id',                  'uuid'),
    ('setores_atuantes',            'ARRAY'),
    ('sectors',                     'ARRAY')
)
SELECT CASE
         WHEN a.attname IS NULL THEN 'FALHA'
         WHEN NOT (format_type(a.atttypid, a.atttypmod) = e.dtype
                   OR (e.dtype = 'ARRAY' AND format_type(a.atttypid, a.atttypmod) LIKE '%[]'))
           THEN 'ATENÇÃO'
         ELSE 'OK'
       END AS resultado,
       format('3.x - Coluna profiles.%s (tipo esperado: %s; encontrado: %s)',
              e.col, e.dtype,
              COALESCE(format_type(a.atttypid, a.atttypmod), 'AUSENTE')) AS verificacao
FROM esperadas e
LEFT JOIN pg_attribute a
  ON a.attrelid = 'public.profiles'::regclass
 AND a.attname = e.col
 AND a.attnum > 0
 AND NOT a.attisdropped
ORDER BY e.col
) t7
UNION ALL
SELECT 9 AS ordem, t8.resultado::text AS resultado, t8.verificacao::text AS verificacao FROM (
SELECT CASE WHEN a.attname IS NULL THEN 'FALHA' ELSE 'OK' END AS resultado,
       format('3.d - Default de profiles.%s = %s', a.attname,
              COALESCE(pg_get_expr(ad.adbin, ad.adrelid), 'NENHUM')) AS verificacao
FROM pg_attribute a
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
WHERE a.attrelid = 'public.profiles'::regclass
  AND a.attname IN ('id', 'role', 'is_active', 'is_maintenance_responsible',
                    'force_password_change', 'sectors')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attname
) t8
UNION ALL
SELECT 10 AS ordem, t9.resultado::text AS resultado, t9.verificacao::text AS verificacao FROM (
WITH esperadas(func) AS (
  VALUES ('is_admin'), ('has_role'), ('handle_new_user'), ('update_updated_at_column')
)
SELECT CASE WHEN p.oid IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       format('4.x - Função public.%s (security definer: %s; search_path: %s)',
              e.func,
              CASE WHEN p.prosecdef THEN 'sim' ELSE 'não' END,
              COALESCE(p.proconfig::text, 'padrão')) AS verificacao
FROM esperadas e
LEFT JOIN pg_proc p
  ON p.pronamespace = 'public'::regnamespace
 AND p.proname = e.func
ORDER BY e.func
) t9
UNION ALL
SELECT 11 AS ordem, t10.resultado::text AS resultado, t10.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regprocedure('auth.uid()') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '4.5 - Função auth.uid() existe' AS verificacao
) t10
UNION ALL
SELECT 12 AS ordem, t11.resultado::text AS resultado, t11.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regprocedure('auth.jwt()') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '4.6 - Função auth.jwt() existe' AS verificacao
) t11
UNION ALL
SELECT 13 AS ordem, t12.resultado::text AS resultado, t12.verificacao::text AS verificacao FROM (
SELECT CASE
         WHEN EXISTS (
           SELECT 1
             FROM pg_trigger t
            WHERE t.tgrelid = 'auth.users'::regclass
              AND NOT t.tgisinternal
              AND pg_get_triggerdef(t.oid) ILIKE '%handle_new_user%'
         ) THEN 'OK'
         ELSE 'FALHA'
       END AS resultado,
       '5.1 - Trigger de auth.users chama public.handle_new_user()' AS verificacao
) t12
UNION ALL
SELECT 14 AS ordem, t13.resultado::text AS resultado, t13.verificacao::text AS verificacao FROM (
SELECT 'ATENÇÃO' AS resultado,
       format('5.d - Trigger em auth.users: %s | %s', t.tgname, pg_get_triggerdef(t.oid)) AS verificacao
FROM pg_trigger t
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal
) t13
UNION ALL
SELECT 15 AS ordem, t14.resultado::text AS resultado, t14.verificacao::text AS verificacao FROM (
SELECT CASE WHEN relrowsecurity THEN 'OK' ELSE 'FALHA' END AS resultado,
       format('6.1 - RLS em profiles (habilitada: %s; forçada: %s)',
              relrowsecurity, relforcerowsecurity) AS verificacao
FROM pg_class WHERE oid = 'public.profiles'::regclass
) t14
UNION ALL
SELECT 16 AS ordem, t15.resultado::text AS resultado, t15.verificacao::text AS verificacao FROM (
SELECT 'OK' AS resultado,
       format('6.2 - Policy "%s" | cmd: %s | roles: %s', pol.polname, pol.polcmd,
              pol.polroles::regrole[]::text) AS verificacao
FROM pg_policy pol
WHERE pol.polrelid = 'public.profiles'::regclass
ORDER BY pol.polname
) t15
UNION ALL
SELECT 17 AS ordem, t16.resultado::text AS resultado, t16.verificacao::text AS verificacao FROM (
SELECT CASE WHEN relacl IS NULL THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       format('6.3 - Grants de profiles: %s', COALESCE(relacl::text, 'NENHUM (defaults)')) AS verificacao
FROM pg_class WHERE oid = 'public.profiles'::regclass
) t16
UNION ALL
SELECT 18 AS ordem, t17.resultado::text AS resultado, t17.verificacao::text AS verificacao FROM (
SELECT CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'OK' ELSE 'ATENÇÃO' END AS resultado,
       format('6.4 - Linhas em profiles: %s (esperado 0 = sem dados institucionais)',
              (SELECT count(*) FROM public.profiles)) AS verificacao
) t17
UNION ALL
SELECT 19 AS ordem, t18.resultado::text AS resultado, t18.verificacao::text AS verificacao FROM (
WITH esperadas(col) AS (
  VALUES ('table_name'), ('record_id'), ('operation'),
         ('old_values'), ('new_values'), ('changed_fields'),
         ('user_id'), ('user_email')
)
SELECT CASE WHEN a.attname IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       format('7.1 - Coluna audit_logs.%s existe', e.col) AS verificacao
FROM esperadas e
LEFT JOIN pg_attribute a
  ON a.attrelid = 'public.audit_logs'::regclass
 AND a.attname = e.col
 AND a.attnum > 0
 AND NOT a.attisdropped
) t18
UNION ALL
SELECT 20 AS ordem, t19.resultado::text AS resultado, t19.verificacao::text AS verificacao FROM (
SELECT CASE
         WHEN has_table_privilege(
                (SELECT p.proowner::regrole::text
                   FROM pg_proc p
                  WHERE p.pronamespace = 'public'::regnamespace
                    AND p.proname = 'handle_new_user' LIMIT 1),
                'public.audit_logs', 'INSERT')
           THEN 'OK'
         ELSE 'ATENÇÃO'
       END AS resultado,
       '7.2 - Proprietário esperado da auditoria tem INSERT em public.audit_logs' AS verificacao
) t19
UNION ALL
SELECT 21 AS ordem, t20.resultado::text AS resultado, t20.verificacao::text AS verificacao FROM (
WITH c AS (
  SELECT CASE WHEN to_regclass('cron.job') IS NULL THEN 0
              ELSE (xpath('/row/n/text()', query_to_xml(
                     'SELECT count(*) AS n FROM cron.job WHERE active', false, true, '')))[1]::text::int
         END AS ativos,
         CASE WHEN to_regclass('cron.job') IS NULL THEN 0
              ELSE (xpath('/row/n/text()', query_to_xml(
                     'SELECT count(*) AS n FROM cron.job', false, true, '')))[1]::text::int
         END AS total
)
SELECT CASE WHEN ativos > 0 THEN 'FALHA'
            WHEN total > 0 THEN 'ATENÇÃO'
            ELSE 'OK' END AS resultado,
       format('8.1 - Jobs em cron.job (pg_cron instalado: %s; ativos: %s; total: %s)',
              (to_regclass('cron.job') IS NOT NULL), ativos, total) AS verificacao
FROM c
) t20
UNION ALL
SELECT 22 AS ordem, t21.resultado::text AS resultado, t21.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
           AND (p.prosrc ILIKE '%webhook%' OR p.prosrc ILIKE '%net.http_post%')
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.2 - Funções com chamadas webhook/http (revisar manualmente se houver)' AS verificacao
) t21
UNION ALL
SELECT 23 AS ordem, t22.resultado::text AS resultado, t22.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         WHERE p.prosrc ILIKE '%mmumfgxngzaivvyqfbed%'
       ) THEN 'FALHA' ELSE 'OK' END AS resultado,
       '8.3 - Nenhuma referência ao projeto de produção em pg_proc.prosrc' AS verificacao
) t22
UNION ALL
SELECT 24 AS ordem, t23.resultado::text AS resultado, t23.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage',
                                 'realtime', 'supabase_functions', 'vault', 'cron',
                                 'net', 'pgtle', 'extensions')
           AND (p.prosrc ILIKE '%resend.com%' OR p.prosrc ILIKE '%elevenlabs%'
                OR p.prosrc ILIKE '%api.lovable%' OR p.prosrc ILIKE '%supabase.co%')
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.4 - URLs de produção/integrações pagas em definições de funções' AS verificacao
) t23
UNION ALL
SELECT 25 AS ordem, t24.resultado::text AS resultado, t24.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage',
                                 'realtime', 'supabase_functions', 'vault', 'cron',
                                 'net', 'pgtle', 'extensions')
           AND (p.prosrc ILIKE '%service_role%' AND p.prosrc ILIKE '%eyJ%')
       ) THEN 'FALHA' ELSE 'OK' END AS resultado,
       '8.5 - Nenhuma chave/secret embutida em definições de funções' AS verificacao
) t24
UNION ALL
SELECT 26 AS ordem, t25.resultado::text AS resultado, t25.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1
           FROM pg_authid a
          WHERE a.rolname IN ('anon', 'authenticated', 'service_role')
            AND a.rolpassword IS NOT NULL AND a.rolpassword <> ''
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.6 - Roles de API sem senha direta gravada (informativo)' AS verificacao
) t25
UNION ALL
SELECT 27 AS ordem, t26.resultado::text AS resultado, t26.verificacao::text AS verificacao FROM (
SELECT CASE WHEN to_regclass('public.audit_logs') IS NOT NULL
                 AND to_regclass('auth.users') IS NOT NULL
                 AND to_regprocedure('auth.uid()') IS NOT NULL
            THEN 'OK' ELSE 'FALHA' END AS resultado,
       '9.1 - Dependências da auditoria (audit_logs, auth.users, auth.uid)' AS verificacao
) t26
UNION ALL
SELECT 28 AS ordem, t27.resultado::text AS resultado, t27.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
          WHERE p.pronamespace = 'public'::regnamespace
            AND p.proname = 'profiles_audit_privileged_changes'
       ) THEN 'ATENÇÃO'
       ELSE 'OK' END AS resultado,
       '9.2 - Função de auditoria do Lote 1 ainda não existe (esperado antes da migration)' AS verificacao
) t27
UNION ALL
SELECT 29 AS ordem, t28.resultado::text AS resultado, t28.verificacao::text AS verificacao FROM (
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger t
          WHERE t.tgrelid = 'public.profiles'::regclass
            AND t.tgname IN ('profiles_guard_privileged_columns_trg',
                             'profiles_audit_privileged_changes_trg')
       ) THEN 'ATENÇÃO'
       ELSE 'OK' END AS resultado,
       '9.3 - Triggers do Lote 1 ainda não existem em profiles (esperado antes da migration)' AS verificacao
) t28
UNION ALL
SELECT 30 AS ordem, t29.resultado::text AS resultado, t29.verificacao::text AS verificacao FROM (
SELECT 'OK' AS resultado,
       format('RESUMO - profiles: %s | user_roles: %s | audit_logs: %s | auth.users: %s',
              (SELECT count(*) FROM public.profiles),
              (SELECT count(*) FROM public.user_roles),
              (SELECT count(*) FROM public.audit_logs),
              (SELECT count(*) FROM auth.users)) AS verificacao
) t29
ORDER BY ordem;
