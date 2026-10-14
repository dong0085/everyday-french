-- Admin panel: two read-only summaries for the app owner.
-- They return account metadata and counts only (never topic content, stories or keys).
-- Only the server (service_role, via the secret key) may call them; the app checks ADMIN_EMAILS first.

create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  days as (
    select generate_series((now() at time zone 'utc')::date - 29, (now() at time zone 'utc')::date, interval '1 day')::date as day
  ),
  own_topics as (
    select * from public.topics where not is_example
  )
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total',   (select count(*) from auth.users),
      'new7',    (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'new30',   (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'active7', (select count(distinct user_id) from (
                    select user_id from public.usage_events where created_at > now() - interval '7 days'
                    union all
                    select user_id from own_topics where created_at > now() - interval '7 days'
                  ) a),
      'signedIn7', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
      'banned',  (select count(*) from auth.users where banned_until > now())
    ),
    'topics', jsonb_build_object(
      'total',      (select count(*) from own_topics),
      'ready',      (select count(*) from own_topics where status = 'ready'),
      'generating', (select count(*) from own_topics where status = 'generating'),
      'failed',     (select count(*) from own_topics where status = 'failed'),
      'new7',       (select count(*) from own_topics where created_at > now() - interval '7 days'),
      -- Quality signal: lines the review pass flagged, out of all words, sentences and story lines.
      'lines', (select count(*) from public.topic_sections s join own_topics t on t.id = s.topic_id,
                  jsonb_path_query(s.data, '$.*[*] ? (@.fr.type() == "string")'))
             + (select count(*) from own_topics t, jsonb_path_query(t.story_fr, '$[*]')),
      'flaggedLines', (select count(*) from public.topic_sections s join own_topics t on t.id = s.topic_id,
                         jsonb_path_query(s.data, '$.*[*] ? (@.flag.type() == "object")'))
                    + (select count(*) from own_topics t, jsonb_path_query(t.story_fr, '$[*] ? (@.flag.type() == "object")')),
      'captures',   (select count(*) from public.captures),
      'capturesOpen', (select count(*) from public.captures where status = 'new')
    ),
    'clips', jsonb_build_object(
      'count', (select count(*) from public.clips),
      'bytes', (select coalesce(sum(bytes), 0) from public.clips)
    ),
    'storage', (
      select coalesce(jsonb_object_agg(bucket_id, jsonb_build_object('files', n, 'bytes', b)), '{}'::jsonb)
      from (
        select bucket_id, count(*) n, coalesce(sum((metadata ->> 'size')::bigint), 0) b
        from storage.objects group by bucket_id
      ) s
    ),
    'dbBytes', pg_database_size(current_database()),
    'heartbeat', (select jsonb_build_object('at', beat_at, 'source', source) from public.heartbeat where id = 1),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'users',  (select count(*) from auth.users u where (u.created_at at time zone 'utc')::date = d.day),
        'topics', (select count(*) from own_topics t where (t.created_at at time zone 'utc')::date = d.day),
        'failed', (select count(*) from own_topics t where (t.created_at at time zone 'utc')::date = d.day and t.status = 'failed'),
        'llm',    (select count(*) from public.usage_events e where e.kind = 'llm' and (e.created_at at time zone 'utc')::date = d.day),
        'tts',    (select count(*) from public.usage_events e where e.kind = 'tts' and (e.created_at at time zone 'utc')::date = d.day)
      ) order by d.day)
      from days d
    ),
    'today', (
      select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb)
      from (select kind, count(*) n from public.usage_events where created_at > now() - interval '24 hours' group by kind) t
    ),
    'usage30', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kind', kind, 'provider', provider, 'model', model, 'calls', n, 'units', units, 'unitType', unit_type,
        'costUsd', cost, 'users', users
      ) order by n desc), '[]'::jsonb)
      from (
        select kind, provider, model, unit_type, count(*) n, sum(units) units, sum(cost_usd) cost, count(distinct user_id) users
        from public.usage_events
        where created_at > now() - interval '30 days'
        group by kind, provider, model, unit_type
      ) u
    ),
    'models30', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'model', model_used, 'ready', ready, 'failed', failed, 'generating', generating
      ) order by ready + failed + generating desc), '[]'::jsonb)
      from (
        select coalesce(model_used, '(none)') model_used,
               count(*) filter (where status = 'ready') ready,
               count(*) filter (where status = 'failed') failed,
               count(*) filter (where status = 'generating') generating
        from own_topics
        where created_at > now() - interval '30 days'
        group by 1
      ) m
    ),
    'failures', (
      select coalesce(jsonb_agg(f order by at desc), '[]'::jsonb)
      from (
        select t.updated_at as at, jsonb_build_object(
          'at', t.updated_at, 'email', u.email, 'model', t.model_used, 'stage', t.stage, 'error', t.error, 'kind', 'topic'
        ) f
        from own_topics t join auth.users u on u.id = t.user_id
        where t.status = 'failed'
        union all
        select s.updated_at, jsonb_build_object(
          'at', s.updated_at, 'email', u.email, 'model', t.model_used, 'stage', 'section: ' || s.slug, 'error', s.error, 'kind', 'section'
        )
        from public.topic_sections s
        join own_topics t on t.id = s.topic_id
        join auth.users u on u.id = s.user_id
        where s.status = 'failed'
        order by 1 desc
        limit 30
      ) x
    ),
    'stuck', (
      select count(*) from own_topics
      where status = 'generating' and coalesce(gen_started_at, created_at) < now() - interval '10 minutes'
    )
  );
$$;

create or replace function public.admin_users()
returns table (
  id              uuid,
  email           text,
  name            text,
  provider        text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  banned_until    timestamptz,
  level           text,
  topics          bigint,
  failed          bigint,
  clips           bigint,
  clip_bytes      bigint,
  captures        bigint,
  key_providers   text[],
  llm_model       text,
  tts_provider    text,
  calls30         bigint,
  cost30          numeric,
  last_active     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email::text,
    p.display_name,
    coalesce(u.raw_app_meta_data ->> 'provider', 'email'),
    u.created_at,
    u.last_sign_in_at,
    u.banned_until,
    p.level,
    (select count(*) from public.topics t where t.user_id = u.id and not t.is_example),
    (select count(*) from public.topics t where t.user_id = u.id and t.status = 'failed'),
    (select count(*) from public.clips c where c.user_id = u.id),
    (select coalesce(sum(c.bytes), 0)::bigint from public.clips c where c.user_id = u.id),
    (select count(*) from public.captures c where c.user_id = u.id),
    (select coalesce(array_agg(distinct k.provider order by k.provider), '{}') from public.api_keys k where k.user_id = u.id),
    nullif(concat_ws('/', p.llm ->> 'provider', p.llm ->> 'model'), ''),
    p.tts ->> 'provider',
    (select count(*) from public.usage_events e where e.user_id = u.id and e.created_at > now() - interval '30 days'),
    (select coalesce(sum(e.cost_usd), 0) from public.usage_events e where e.user_id = u.id and e.created_at > now() - interval '30 days'),
    greatest(
      u.last_sign_in_at,
      (select max(e.created_at) from public.usage_events e where e.user_id = u.id),
      (select max(t.updated_at) from public.topics t where t.user_id = u.id and not t.is_example)
    )
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc
  limit 1000;
$$;

revoke all on function public.admin_overview() from public, anon, authenticated;
revoke all on function public.admin_users() from public, anon, authenticated;
grant execute on function public.admin_overview() to service_role;
grant execute on function public.admin_users() to service_role;
