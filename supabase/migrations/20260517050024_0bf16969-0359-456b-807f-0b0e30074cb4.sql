
-- Ensure pg_cron + pg_net are enabled (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper: project base URL + service-role key are stored in vault/secrets; use them
-- via current_setting fallbacks. We rely on the standard SUPABASE_URL convention.

-- Unschedule any prior runs (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('dynamo-cost-snapshot');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('dynamo-cost-budget-check');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('dynamo-cost-anomaly-check');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('dynamo-weekly-digest');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 00:10 UTC daily — roll yesterday's logs into daily_costs
SELECT cron.schedule(
  'dynamo-cost-snapshot',
  '10 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jizhbglplkymmjgxnkts.supabase.co/functions/v1/cost-monitor?mode=snapshot',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 00:15 UTC daily — budget tier alerts
SELECT cron.schedule(
  'dynamo-cost-budget-check',
  '15 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jizhbglplkymmjgxnkts.supabase.co/functions/v1/cost-monitor?mode=budget',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 23:55 UTC daily — anomaly check
SELECT cron.schedule(
  'dynamo-cost-anomaly-check',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jizhbglplkymmjgxnkts.supabase.co/functions/v1/cost-monitor?mode=anomaly',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Sundays 14:00 UTC — weekly digest
SELECT cron.schedule(
  'dynamo-weekly-digest',
  '0 14 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://jizhbglplkymmjgxnkts.supabase.co/functions/v1/weekly-digest',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
