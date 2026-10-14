-- Second keepalive leg (the first is the daily Vercel cron) and housekeeping, inside the database.
create extension if not exists pg_cron;

select cron.schedule(
  'heartbeat',
  '0 */8 * * *',
  $$update public.heartbeat set beat_at = now(), source = 'pg_cron' where id = 1$$
);

select cron.schedule(
  'prune-usage-events',
  '30 3 * * *',
  $$delete from public.usage_events where created_at < now() - interval '90 days'$$
);
