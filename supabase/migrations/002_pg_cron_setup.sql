-- pg_cron job to fire pending reminders every minute
-- Run this in the Supabase SQL Editor AFTER deploying the Edge Function
-- Replace YOUR_PROJECT_REF with your actual project reference (e.g. abcdefghijklm)
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key

SELECT cron.schedule(
  'fire-reminders',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fire-reminders',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  WHERE EXISTS (
    SELECT 1 FROM reminders WHERE status = 'pending' AND fire_at <= now()
  );
  $$
);

-- To check if the job was created:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('fire-reminders');
