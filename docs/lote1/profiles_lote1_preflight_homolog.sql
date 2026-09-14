-- ============================================================================
-- SiDIF — Lote 1 (public.profiles) — PREFLIGHT do ambiente de homologação
--
-- Arquivo SOMENTE LEITURA: contém exclusivamente consultas ao catálogo
-- (pg_catalog / information_schema) e contagens. Não cria, altera ou remove
-- nenhum objeto. Pode ser executado repetidamente no SQL Editor.
--
-- Cada bloco retorna coluna "resultado" com: OK | FALHA | ATENÇÃO.
--
-- Critério de parada: qualquer FALHA impede a aplicação de
-- profiles_lote1_v3.sql. ATENÇÃO exige revisão manual antes de prosseguir.
--
-- Execução prevista: SQL Editor do projeto ISOLADO, antes da migration.
-- NÃO executar no projeto de produção (mmumfgxngzaivvyqfbed).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- C0 — Confirmação de que este banco NÃO é a produção
-- ----------------------------------------------------------------------------
-- Comparar a saída com a URL do painel do projeto isolado.
-- Se a URL do painel contiver 'mmumfgxngzaivvyqfbed', ABORTAR.
SELECT CASE
         WHEN current_setting('app.settings.project_ref', true) LIKE '%mmumfgxngzaivvyqfbed%'
           THEN 'FALHA'
         ELSE 'OK'
       END AS resultado,
       'C0 - Banco não é produção (confirmar ref no painel)' AS verificacao,
       current_database() AS banco,
       inet_server_addr()::text AS servidor;

-- ----------------------------------------------------------------------------
-- 1. Existência das tabelas
-- ----------------------------------------------------------------------------
SELECT CASE WHEN to_regclass('public.profiles') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.1 - Tabela public.profiles existe' AS verificacao;

SELECT CASE WHEN to_regclass('public.user_roles') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.2 - Tabela public.user_roles existe' AS verificacao;

SELECT CASE WHEN to_regclass('public.audit_logs') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.3 - Tabela public.audit_logs existe' AS verificacao;

SELECT CASE WHEN to_regclass('auth.users') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '1.4 - Tabela auth.users existe' AS verificacao;

-- ----------------------------------------------------------------------------
-- 2. Tipos
-- ----------------------------------------------------------------------------
SELECT CASE WHEN to_regtype('public.user_role') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '2.1 - Tipo public.user_role existe' AS verificacao;

SELECT CASE WHEN to_regtype('public.sector_type') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '2.2 - Tipo public.sector_type existe' AS verificacao;

-- ----------------------------------------------------------------------------
-- 3. Colunas e defaults de public.profiles
-- ----------------------------------------------------------------------------
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
ORDER BY e.col;

-- Defaults relevantes (informativo: divergência exige revisão, não bloqueia por si só)
SELECT CASE WHEN a.attname IS NULL THEN 'FALHA' ELSE 'OK' END AS resultado,
       format('3.d - Default de profiles.%s = %s', a.attname,
              COALESCE(pg_get_expr(ad.adbin, ad.adrelid), 'NENHUM')) AS verificacao
FROM pg_attribute a
LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
WHERE a.attrelid = 'public.profiles'::regclass
  AND a.attname IN ('id', 'role', 'is_active', 'is_maintenance_responsible',
                    'force_password_change', 'sectors')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attname;

-- ----------------------------------------------------------------------------
-- 4. Funções necessárias (existência, owner, security definer, search_path)
-- ----------------------------------------------------------------------------
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
ORDER BY e.func;

SELECT CASE WHEN to_regprocedure('auth.uid()') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '4.5 - Função auth.uid() existe' AS verificacao;

SELECT CASE WHEN to_regprocedure('auth.jwt()') IS NOT NULL THEN 'OK' ELSE 'FALHA' END AS resultado,
       '4.6 - Função auth.jwt() existe' AS verificacao;

-- ----------------------------------------------------------------------------
-- 5. Trigger de auth.users que chama public.handle_new_user()
-- ----------------------------------------------------------------------------
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
       '5.1 - Trigger de auth.users chama public.handle_new_user()' AS verificacao;

-- Detalhe dos triggers existentes em auth.users (revisão visual)
SELECT 'ATENÇÃO' AS resultado,
       format('5.d - Trigger em auth.users: %s | %s', t.tgname, pg_get_triggerdef(t.oid)) AS verificacao
FROM pg_trigger t
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal;

-- ----------------------------------------------------------------------------
-- 6. Estado de public.profiles: RLS, policies, grants, dados
-- ----------------------------------------------------------------------------
SELECT CASE WHEN relrowsecurity THEN 'OK' ELSE 'FALHA' END AS resultado,
       format('6.1 - RLS em profiles (habilitada: %s; forçada: %s)',
              relrowsecurity, relforcerowsecurity) AS verificacao
FROM pg_class WHERE oid = 'public.profiles'::regclass;

-- Policies atuais (informativo — registrar para comparação pós-migration e rollback)
SELECT 'OK' AS resultado,
       format('6.2 - Policy "%s" | cmd: %s | roles: %s', pol.polname, pol.polcmd,
              pol.polroles::regrole[]::text) AS verificacao
FROM pg_policy pol
WHERE pol.polrelid = 'public.profiles'::regclass
ORDER BY pol.polname;

-- Grants atuais (esperado base de produção: arwdDxtm para anon/authenticated/service_role)
SELECT CASE WHEN relacl IS NULL THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       format('6.3 - Grants de profiles: %s', COALESCE(relacl::text, 'NENHUM (defaults)')) AS verificacao
FROM pg_class WHERE oid = 'public.profiles'::regclass;

SELECT CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'OK' ELSE 'ATENÇÃO' END AS resultado,
       format('6.4 - Linhas em profiles: %s (esperado 0 = sem dados institucionais)',
              (SELECT count(*) FROM public.profiles)) AS verificacao;

-- ----------------------------------------------------------------------------
-- 7. Estado de public.audit_logs
-- ----------------------------------------------------------------------------
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
 AND NOT a.attisdropped;

-- A função de auditoria é SECURITY DEFINER: grava em audit_logs com os privilégios
-- do PROPRIETÁRIO da função. O owner da trigger function criada pela migration
-- precisa ter INSERT em audit_logs. Verificação de capacidade do owner-padrão (postgres):
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
       '7.2 - Proprietário esperado da auditoria tem INSERT em public.audit_logs' AS verificacao;

-- ----------------------------------------------------------------------------
-- 8. Segurança do ambiente
-- ----------------------------------------------------------------------------
SELECT CASE
         WHEN EXISTS (SELECT 1 FROM cron.job WHERE active) THEN 'FALHA'
         WHEN EXISTS (SELECT 1 FROM cron.job) THEN 'ATENÇÃO'
         ELSE 'OK'
       END AS resultado,
       format('8.1 - Jobs em cron.job (ativos: %s; total: %s)',
              (SELECT count(*) FROM cron.job WHERE active),
              (SELECT count(*) FROM cron.job)) AS verificacao;

-- Webhooks de banco (pg_net / triggers http) — informativo
SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
           AND (p.prosrc ILIKE '%webhook%' OR p.prosrc ILIKE '%net.http_post%')
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.2 - Funções com chamadas webhook/http (revisar manualmente se houver)' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         WHERE p.prosrc ILIKE '%mmumfgxngzaivvyqfbed%'
       ) THEN 'FALHA' ELSE 'OK' END AS resultado,
       '8.3 - Nenhuma referência ao projeto de produção em pg_proc.prosrc' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage',
                                 'realtime', 'supabase_functions', 'vault', 'cron',
                                 'net', 'pgtle', 'extensions')
           AND (p.prosrc ILIKE '%resend.com%' OR p.prosrc ILIKE '%elevenlabs%'
                OR p.prosrc ILIKE '%api.lovable%' OR p.prosrc ILIKE '%supabase.co%')
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.4 - URLs de produção/integrações pagas em definições de funções' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage',
                                 'realtime', 'supabase_functions', 'vault', 'cron',
                                 'net', 'pgtle', 'extensions')
           AND (p.prosrc ILIKE '%service_role%' AND p.prosrc ILIKE '%eyJ%')
       ) THEN 'FALHA' ELSE 'OK' END AS resultado,
       '8.5 - Nenhuma chave/secret embutida em definições de funções' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1
           FROM pg_authid a
          WHERE a.rolname IN ('anon', 'authenticated', 'service_role')
            AND a.rolpassword IS NOT NULL AND a.rolpassword <> ''
       ) THEN 'ATENÇÃO' ELSE 'OK' END AS resultado,
       '8.6 - Roles de API sem senha direta gravada (informativo)' AS verificacao;

-- ----------------------------------------------------------------------------
-- 9. Compatibilidade da função de auditoria (requisitos do Lote 1)
-- ----------------------------------------------------------------------------
-- A migration cria a função de auditoria SECURITY DEFINER. Este bloco confirma
-- que as dependências dela existem e documenta o que será conferido depois
-- (owner efetivo, prosecdef e search_path) nas verificações V1–V6 pós-migration.
SELECT CASE WHEN to_regclass('public.audit_logs') IS NOT NULL
                 AND to_regclass('auth.users') IS NOT NULL
                 AND to_regprocedure('auth.uid()') IS NOT NULL
            THEN 'OK' ELSE 'FALHA' END AS resultado,
       '9.1 - Dependências da auditoria (audit_logs, auth.users, auth.uid)' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc p
          WHERE p.pronamespace = 'public'::regnamespace
            AND p.proname = 'profiles_audit_privileged_changes'
       ) THEN 'ATENÇÃO'
       ELSE 'OK' END AS resultado,
       '9.2 - Função de auditoria do Lote 1 ainda não existe (esperado antes da migration)' AS verificacao;

SELECT CASE WHEN EXISTS (
         SELECT 1 FROM pg_trigger t
          WHERE t.tgrelid = 'public.profiles'::regclass
            AND t.tgname IN ('profiles_guard_privileged_columns_trg',
                             'profiles_audit_privileged_changes_trg')
       ) THEN 'ATENÇÃO'
       ELSE 'OK' END AS resultado,
       '9.3 - Triggers do Lote 1 ainda não existem em profiles (esperado antes da migration)' AS verificacao;

-- ----------------------------------------------------------------------------
-- RESUMO — execute como última consulta: relação de contagens gerais
-- ----------------------------------------------------------------------------
SELECT 'OK' AS resultado,
       format('RESUMO - profiles: %s | user_roles: %s | audit_logs: %s | auth.users: %s',
              (SELECT count(*) FROM public.profiles),
              (SELECT count(*) FROM public.user_roles),
              (SELECT count(*) FROM public.audit_logs),
              (SELECT count(*) FROM auth.users)) AS verificacao;

-- FIM DO PREFLIGHT — nenhum objeto foi criado, alterado ou removido.
