-- Push tokens.
--
-- One row per user — the latest Expo push token wins. When a partner
-- writes an event, the server reads the OTHER user's token from this
-- table and fires a push via Expo's push API.

create table if not exists public.iita_push_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null,
  platform   text,
  updated_at timestamptz not null default now()
);

alter table public.iita_push_tokens enable row level security;

-- All writes/reads go through the server with the service-role key.
-- No anon-key access; the table is effectively server-private. RLS stays
-- on as defense-in-depth (deny-by-default with no policies).
