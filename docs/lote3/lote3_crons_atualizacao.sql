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

-- ── notify-rdo-delay ────────────────────────────────────────────────
-- Remove o job antigo (sem senha) e recria com a senha interna.
-- Se a leitura mostrar um nome diferente de 'notify-rdo-delay',
-- ajuste o nome em cron.unschedule(...).
SELECT cron.unschedule('notify-rdo-delay');

SELECT cron.schedule(
  'notify-rdo-delay',
  '0 9 * * *', -- diariamente 09:00 UTC — CONFIRMAR com a leitura
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

-- ── demo-reset ──────────────────────────────────────────────────────
-- Se a leitura NÃO mostrar um job para demo-reset, apague este bloco
-- (significa que o reset de demonstração só é disparado manualmente).
SELECT cron.unschedule('demo-reset');

SELECT cron.schedule(
  'demo-reset',
  '0 6 * * *', -- diariamente 06:00 UTC — CONFIRMAR com a leitura
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
