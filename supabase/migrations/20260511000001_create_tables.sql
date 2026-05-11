-- iita — initial schema.
--
-- Two tables:
--   • iita_weeks  — one row per (user, ISO Monday-of-week). Payload is
--                   the whole week object the app stores in AsyncStorage,
--                   shipped as jsonb so we don't have to migrate every
--                   time we add a column.
--   • iita_events — one row per year event. Flat columns (not jsonb)
--                   because the year view filters by date.

create table if not exists public.iita_weeks (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  week_start  date        not null,
  payload     jsonb       not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, week_start)
);

create table if not exists public.iita_events (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        date        not null,
  "endDate"   date,
  title       text        not null,
  location    text,
  "withWho"   text,
  created_at  timestamptz not null default now()
);

create index if not exists iita_events_user_date_idx
  on public.iita_events (user_id, date);

-- ── Row-level security ───────────────────────────────────────────────
-- Every row is scoped to its owner. Without these policies a user
-- carrying a valid JWT could SELECT/UPDATE any row in the table.

alter table public.iita_weeks  enable row level security;
alter table public.iita_events enable row level security;

drop policy if exists "user-rw-weeks"  on public.iita_weeks;
drop policy if exists "user-rw-events" on public.iita_events;

create policy "user-rw-weeks"
  on public.iita_weeks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user-rw-events"
  on public.iita_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
