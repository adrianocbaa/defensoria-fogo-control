-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para verificar teletrabalhos encerrando diariamente às 8h (horário de Brasília - 11h UTC)
SELECT cron.schedule(
  'check-teletrabalho-ending-daily',
  '0 11 * * *', -- Executa todo dia às 11h UTC (8h horário de Brasília)
  $$
  SELECT
    net.http_post(
        url:='https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/check-teletrabalho-ending',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdW1mZ3huZ3phaXZ2eXFmYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Mjc5MjksImV4cCI6MjA2ODAwMzkyOX0.az57D3U3M8roILNe52x8heM-HJb2S3gERpSaugvspK8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);