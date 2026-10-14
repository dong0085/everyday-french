-- v2 learning loop: spaced review, the learner's own sentences, dialogue and "next time" lines.

-- ---------- profiles ----------

-- The learner's first language, so notes point out what it does not mark (articles, gender, liaison…).
alter table public.profiles
  add column l1 text not null default 'other' check (l1 in ('zh', 'en', 'other'));

-- ---------- topics ----------

alter table public.topics
  add column dialogue   jsonb not null default '[]',  -- [{ id, who, fr, en, zh, say, note, flag }]
  add column next_time  jsonb not null default '[]',  -- [{ id, fr, en, zh }]: lines to say next time this happens
  add column l1         text not null default 'other',
  add column studied_at timestamptz;                  -- last time the guided study was finished

alter table public.topics drop constraint topics_stage_check;
alter table public.topics add constraint topics_stage_check
  check (stage in ('outline', 'sections', 'story', 'dialogue', 'check', 'done'));

-- ---------- review items (light spaced review) ----------
-- One row per line the learner reviews. Boxes 0–5 map to 1 / 3 / 7 / 14 / 30 days.
-- Rows are rebuilt from topic content on the server; the learner can read and grade their own.

create table public.review_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  line_id    text not null,   -- the w… / s… / r… / d… / m… id inside the topic
  kind       text not null check (kind in ('word', 'phrase', 'sentence', 'story', 'dialogue', 'mine')),
  fr         text not null check (char_length(fr) <= 400),
  box        smallint not null default 0 check (box between 0 and 5),
  due_on     date not null default (current_date + 1),
  reps       int not null default 0,
  lapses     int not null default 0,
  last_seen  timestamptz,
  starred    boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, topic_id, line_id)
);
create index review_items_due_idx on public.review_items (user_id, due_on);
create index review_items_topic_idx on public.review_items (topic_id);

alter table public.review_items enable row level security;
revoke all on public.review_items from anon;

create policy "own review items" on public.review_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.topics t where t.id = topic_id and t.user_id = (select auth.uid()))
  );

-- ---------- attempts ("Your turn": a sentence of the learner's own, with gentle feedback) ----------

create table public.attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  topic_id   uuid not null references public.topics (id) on delete cascade,
  section_id uuid references public.topic_sections (id) on delete set null,
  text       text not null check (char_length(text) between 1 and 400),
  feedback   jsonb,   -- { ok, fixed, note, natural }
  created_at timestamptz not null default now()
);
create index attempts_topic_idx on public.attempts (topic_id, created_at);

alter table public.attempts enable row level security;
revoke all on public.attempts from anon;

create policy "own attempts" on public.attempts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.topics t where t.id = topic_id and t.user_id = (select auth.uid()))
  );
