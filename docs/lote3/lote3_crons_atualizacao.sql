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
--
-- BLOQUEADO TEMPORARIAMENTE: não execute novamente até confirmar, pelo
-- arquivo lote3_crons_leitura.sql, o proprietário dos jobs 3 e 4.
-- cron.alter_job só aceita alterações feitas pelo proprietário do job.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Nomes e horários confirmados pela leitura em produção (29/09/2026).
-- Os jobs check-maintenance-confirmations-5min e check-teletrabalho-ending-daily
-- NÃO são alterados.

-- A tentativa de alterar pelo jobid também foi recusada por propriedade.
-- Este conteúdo fica preservado, mas só poderá ser executado depois de
-- definida uma forma suportada de agir como o proprietário confirmado.

-- ── jobid 3: notify-rdo-delay-daily (diário 08:00 UTC) ──────────────
SELECT cron.alter_job(
  job_id := 3,
  command := $cmd$
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

-- ── jobid 4: demo-reset-weekly (domingo 03:00 UTC) ──────────────────
SELECT cron.alter_job(
  job_id := 4,
  command := $cmd$
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

-- Verificação final (leitura)
SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobid;
