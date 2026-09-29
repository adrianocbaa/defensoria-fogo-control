-- Lote 3 — Atualização dos agendamentos automáticos (cron jobs).
-- Rode no SQL Editor do projeto de PRODUÇÃO, SOMENTE DEPOIS de:
--   1) cadastrar o segredo SIDIF_CRON_SECRET no painel do Supabase
--      (Project Settings → Edge Functions → Secrets);
--   2) rodar lote3_crons_leitura.sql e confirmar os nomes dos jobs.
--
-- O que este script faz: recria os jobs que chamam as funções
-- notify-rdo-delay e demo-reset, adicionando o cabeçalho
-- x-sidif-cron-secret com a senha interna. Os horários (schedule)
-- são preservados — AJUSTE abaixo se a leitura mostrar horários
-- diferentes dos assumidos.
--
-- IMPORTANTE: substitua COLE_A_SENHA_INTERNA_AQUI pelo valor do
-- segredo SIDIF_CRON_SECRET (o mesmo cadastrado no painel).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nomes e horários confirmados pela leitura em produção (29/09/2026).
-- Os jobs check-maintenance-confirmations-5min e check-teletrabalho-ending-daily
-- NÃO são alterados.

-- ── notify-rdo-delay-daily (diário 08:00 UTC) ───────────────────────
SELECT cron.unschedule('notify-rdo-delay-daily');

SELECT cron.schedule(
  'notify-rdo-delay-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/notify-rdo-delay',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sidif-cron-secret', 'COLE_A_SENHA_INTERNA_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── demo-reset-weekly (domingo 03:00 UTC) ───────────────────────────
SELECT cron.unschedule('demo-reset-weekly');

SELECT cron.schedule(
  'demo-reset-weekly',
  '0 3 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/demo-reset',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sidif-cron-secret', 'COLE_A_SENHA_INTERNA_AQUI'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificação final (leitura): confirma que os jobs foram recriados.
SELECT jobid, jobname, schedule, active FROM cron.job ORDER BY jobname;
