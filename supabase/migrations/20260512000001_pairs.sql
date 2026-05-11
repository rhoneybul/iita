-- Pairs: two users sharing one calendar.
--
-- Schema:
--   • iita_pairs        — the shared-calendar entity. Created lazily by
--                          the server the first time a user signs in.
--   • iita_pair_members — many-to-many user ↔ pair. Cap of 2 enforced
--                          by the server (no DB-level constraint so we
--                          could relax to households later).
--   • iita_invites      — short share codes. Server-issued, 7-day TTL.
--
-- Weeks and events get re-scoped from user_id to pair_id. The previous
-- migration's tables are dropped — at this point they're empty (the
-- app only just shipped), so we don't bother with a backfill path.

create extension if not exists "uuid-ossp";

drop table if exists public.iita_events cascade;
drop table if exists public.iita_weeks  cascade;

create table if not exists public.iita_pairs (
  id         uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

create table if not exists public.iita_pair_members (
  pair_id   uuid not null references public.iita_pairs(id) on delete cascade,
  user_id   uuid not null references auth.users(id)        on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);
create index if not exists iita_pair_members_user_idx
  on public.iita_pair_members(user_id);

create table if not exists public.iita_invites (
  code         text primary key,
  pair_id      uuid not null references public.iita_pairs(id) on delete cascade,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  accepted_by  uuid references auth.users(id),
  accepted_at  timestamptz
);
create index if not exists iita_invites_pair_idx on public.iita_invites(pair_id);

-- Re-create the data tables, pair-scoped.
create table public.iita_weeks (
  pair_id    uuid not null references public.iita_pairs(id) on delete cascade,
  week_start date not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (pair_id, week_start)
);

create table public.iita_events (
  id         text primary key,
  pair_id    uuid not null references public.iita_pairs(id) on delete cascade,
  date       date not null,
  "endDate"  date,
  title      text not null,
  location   text,
  "withWho"  text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index iita_events_pair_date_idx on public.iita_events (pair_id, date);

-- ── RLS ─────────────────────────────────────────────────────────────
-- All routes go through the server (which uses the service role and
-- bypasses RLS), but we still enable RLS as defense-in-depth so a
-- compromised anon key can't read someone else's calendar via PostgREST.

alter table public.iita_pairs        enable row level security;
alter table public.iita_pair_members enable row level security;
alter table public.iita_invites      enable row level security;
alter table public.iita_weeks        enable row level security;
alter table public.iita_events       enable row level security;

create or replace function public.my_pair_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select pair_id from public.iita_pair_members where user_id = auth.uid()
$$;

drop policy if exists "member-read-pair"     on public.iita_pairs;
drop policy if exists "member-read-members"  on public.iita_pair_members;
drop policy if exists "member-read-invite"   on public.iita_invites;
drop policy if exists "pair-rw-weeks"        on public.iita_weeks;
drop policy if exists "pair-rw-events"       on public.iita_events;

create policy "member-read-pair" on public.iita_pairs
  for select using (id in (select public.my_pair_ids()));

create policy "member-read-members" on public.iita_pair_members
  for select using (pair_id in (select public.my_pair_ids()));

create policy "member-read-invite" on public.iita_invites
  for select using (pair_id in (select public.my_pair_ids()) or accepted_by = auth.uid());

create policy "pair-rw-weeks" on public.iita_weeks
  for all
  using  (pair_id in (select public.my_pair_ids()))
  with check (pair_id in (select public.my_pair_ids()));

create policy "pair-rw-events" on public.iita_events
  for all
  using  (pair_id in (select public.my_pair_ids()))
  with check (pair_id in (select public.my_pair_ids()));
