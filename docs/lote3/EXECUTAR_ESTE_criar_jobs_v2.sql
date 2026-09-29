-- LOTE 3 — EXECUTE ESTA VERSÃO.
-- Este comando NÃO usa cron.alter_job e NÃO tenta alterar os jobs 3 e 4.
-- Ele cria dois novos agendamentos autorizados, mantendo os mesmos horários.
--
-- Antes de executar, substitua as DUAS ocorrências de
-- COLE_A_SENHA_INTERNA_AQUI pelo valor cadastrado como SIDIF_CRON_SECRET.

-- Aviso de RDO atrasado: diariamente às 08:00 UTC.
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

-- Reset da demonstração: domingo às 03:00 UTC.
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

-- Verificação final: devem aparecer 6 agendamentos.
SELECT jobid, jobname, schedule, active, username
FROM cron.job
ORDER BY jobid;