-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the function to run daily at 8:00 AM (Brasilia time is UTC-3, so 11:00 UTC)
SELECT cron.schedule(
  'check-teletrabalho-ending-daily',
  '0 11 * * *', -- Run at 11:00 UTC (8:00 AM Brasilia time)
  $$
  SELECT
    net.http_post(
        url:='https://mmumfgxngzaivvyqfbed.supabase.co/functions/v1/check-teletrabalho-ending',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdW1mZ3huZ3phaXZ2eXFmYmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0Mjc5MjksImV4cCI6MjA2ODAwMzkyOX0.az57D3U3M8roILNe52x8heM-HJb2S3gERpSaugvspK8"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);