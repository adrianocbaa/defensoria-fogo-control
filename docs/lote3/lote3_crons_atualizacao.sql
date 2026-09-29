-- Lote 3 — Novos agendamentos automáticos (cron jobs) com senha interna.
-- Rode no SQL Editor do projeto de PRODUÇÃO.
--
-- Contexto (leitura de 29/09/2026): os jobs 3 (notify-rdo-delay-daily) e
-- 4 (demo-reset-weekly) pertencem a supabase_read_only_user, e o usuário
-- do SQL Editor (postgres) não pode alterá-los nem apagá-los.
--
-- Solução: criar DOIS jobs novos, pertencentes ao postgres, com os
-- mesmos horários e o cabeçalho x-sidif-cron-secret. Os jobs antigos
-- NÃO são tocados; depois que as funções corrigidas forem publicadas,
-- eles passam a ser recusados (401) e não fazem mais nada.
--
-- Substitua as DUAS ocorrências de COLE_A_SENHA_INTERNA_AQUI pelo valor
-- do segredo SIDIF_CRON_SECRET.

-- ── notify-rdo-delay (diário 08:00 UTC) ─────────────────────────────
SELECT cron.schedule(
  'notify-rdo-delay-daily-v2',
  '0 8 * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/notify-rdo-delay',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sidif-cron-secret', 'COLE_A_SENHA_INTERNA_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cmd$
);

-- ── demo-reset (domingo 03:00 UTC) ──────────────────────────────────
SELECT cron.schedule(
  'demo-reset-weekly-v2',
  '0 3 * * 0',
  $cmd$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/demo-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sidif-cron-secret', 'COLE_A_SENHA_INTERNA_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cmd$
);

-- Verificação final (leitura) — devem aparecer 6 jobs
SELECT jobid, jobname, schedule, active, username FROM cron.job ORDER BY jobid;
