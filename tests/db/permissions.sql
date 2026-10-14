-- Browser roles must not be able to read server-only tables at all.
-- Run: pnpm test:db   (local Supabase must be running)
\set ON_ERROR_STOP off
set role authenticated;
select 'FAIL: authenticated can read api_keys' from public.api_keys limit 1;
select 'FAIL: authenticated can read usage_events' from public.usage_events limit 1;
insert into public.usage_events (kind) values ('llm');
reset role;
set role anon;
select 'FAIL: anon can read topics' from public.topics limit 1;
reset role;
