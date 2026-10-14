-- Everyday French: initial schema.
-- Every user-owned table has RLS, and rows belong to auth.users (deleting a user deletes their rows).
-- api_keys and usage_events are server-only: the browser roles have no grants on them at all.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------- helpers ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- profiles ----------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  level         text not null default 'A2' check (level in ('A1', 'A2', 'B1', 'B2')),
  self_gender   text not null default 'x' check (self_gender in ('m', 'f', 'x')),
  explain_lang  text not null default 'en' check (explain_lang in ('en', 'zh')),
  zh_gloss      boolean not null default false,
  llm           jsonb,   -- { provider, model, keyId }
  tts           jsonb,   -- { provider, model, voice, voiceName, keyId }
  stt           jsonb,   -- { provider, model, keyId }
  set_up_at     timestamptz,  -- level and gender answered
  example_seeded boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- A profile row appears as soon as someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- api keys (server only) ----------

create table public.api_keys (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  provider              text not null,
  label                 text not null default 'default',
  base_url              text,              -- custom provider only
  supports_json_schema  boolean not null default false,  -- custom provider only
  ciphertext            text not null,     -- base64
  iv                    text not null,     -- base64
  auth_tag              text not null,     -- base64
  key_version           int not null default 1,
  last4                 text not null,
  created_at            timestamptz not null default now(),
  last_used_at          timestamptz,
  unique (user_id, provider, label)
);

-- ---------- captures (quick notes waiting to become topics) ----------

create table public.captures (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  text        text not null default '' check (char_length(text) <= 8000),
  audio_path  text,
  audio_mime  text,
  status      text not null default 'new' check (status in ('new', 'used')),
  topic_id    uuid,
  created_at  timestamptz not null default now()
);
create index captures_user_idx on public.captures (user_id, created_at desc);

-- ---------- topics ----------

create table public.topics (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null default '',
  title_fr         text not null default '',
  summary          text not null default '',
  story            text not null default '',   -- the learner's story, cleaned up, in the explanation language
  source_text      text not null default '' check (char_length(source_text) <= 8000),
  answers          jsonb,                       -- [{ question, answer }] from "Ask me questions first"
  level            text not null default 'A2',
  explain_lang     text not null default 'en',
  self_gender      text not null default 'x',
  zh_gloss         boolean not null default false,
  status           text not null default 'generating'
                   check (status in ('generating', 'ready', 'failed')),
  stage            text not null default 'outline'
                   check (stage in ('outline', 'sections', 'story', 'check', 'done')),
  error            text,
  model_used       text,
  story_fr         jsonb not null default '[]',  -- "My story": [{ id, fr, en, note, flag }]
  gender_note      text,
  is_example       boolean not null default false,
  gen_started_at   timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index topics_user_idx on public.topics (user_id, created_at desc);
create trigger topics_touch before update on public.topics
  for each row execute function public.touch_updated_at();

create table public.topic_sections (
  id           uuid primary key default gen_random_uuid(),
  topic_id     uuid not null references public.topics (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  position     int not null,
  slug         text not null,
  title        text not null default '',
  title_fr     text not null default '',
  intro        text not null default '',
  core_words   jsonb not null default '[]',  -- planned in the outline, so sections never overlap
  status       text not null default 'pending'
               check (status in ('pending', 'generating', 'ready', 'failed')),
  error        text,
  data         jsonb not null default '{"words": [], "sentences": [], "tips": []}',
  search_text  text not null default '',
  updated_at   timestamptz not null default now(),
  unique (topic_id, slug)
);
create index topic_sections_topic_idx on public.topic_sections (topic_id, position);
create index topic_sections_search_idx on public.topic_sections
  using gin (search_text extensions.gin_trgm_ops);

-- search_text = every string in the section, lowercased and without accents.
create or replace function public.topic_sections_search()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_text := lower(extensions.unaccent(concat_ws(' ',
    new.title, new.title_fr,
    (select string_agg(v #>> '{}', ' ')
       from jsonb_path_query(new.data, 'strict $.**') as v
      where jsonb_typeof(v) = 'string')
  )));
  new.updated_at := now();
  return new;
end;
$$;

create trigger topic_sections_search before insert or update on public.topic_sections
  for each row execute function public.topic_sections_search();

-- ---------- audio clips ----------

create table public.clips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  cache_key     text not null,   -- sha256 of provider|model|voice|text
  text          text not null,
  provider      text not null,
  model         text not null,
  voice         text not null,
  storage_path  text not null,
  bytes         int,
  signed_url    text,
  signed_until  timestamptz,
  created_at    timestamptz not null default now(),
  unique (user_id, cache_key)
);
create index clips_user_text_idx on public.clips (user_id, text);

-- ---------- usage events (server only; rate limits and the monthly usage view) ----------

create table public.usage_events (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete cascade,
  kind        text not null,       -- llm | tts | stt | key_test
  provider    text,
  model       text,
  units       int not null default 0,
  unit_type   text,                -- tokens | chars | seconds
  cost_usd    numeric(10, 5),
  created_at  timestamptz not null default now()
);
create index usage_events_user_idx on public.usage_events (user_id, kind, created_at desc);
create index usage_events_time_idx on public.usage_events (kind, created_at desc);

-- ---------- keepalive ----------

create table public.heartbeat (
  id       int primary key default 1 check (id = 1),
  beat_at  timestamptz not null default now(),
  source   text
);
insert into public.heartbeat (id, source) values (1, 'migration');

-- ---------- row level security ----------

alter table public.profiles       enable row level security;
alter table public.api_keys       enable row level security;
alter table public.captures       enable row level security;
alter table public.topics         enable row level security;
alter table public.topic_sections enable row level security;
alter table public.clips          enable row level security;
alter table public.usage_events   enable row level security;
alter table public.heartbeat      enable row level security;

-- Browser roles never touch these tables; server code uses the secret key.
revoke all on public.api_keys, public.usage_events, public.heartbeat from anon, authenticated;
-- Signed-out visitors have no data at all.
revoke all on public.profiles, public.captures, public.topics, public.topic_sections, public.clips from anon;

create policy "own profile: read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "own captures" on public.captures
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own topics" on public.topics
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "own sections" on public.topic_sections
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.topics t where t.id = topic_id and t.user_id = (select auth.uid()))
  );

create policy "own clips: read" on public.clips
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own clips: delete" on public.clips
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- storage ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('clips', 'clips', false, 2097152, array['audio/mpeg']),
  ('captures', 'captures', false, 5242880,
   array['audio/mp4', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/aac'])
on conflict (id) do nothing;

-- Users may read objects in their own folder ({user_id}/...). Uploads and deletes happen on the server.
create policy "own audio: read" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('clips', 'captures')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
