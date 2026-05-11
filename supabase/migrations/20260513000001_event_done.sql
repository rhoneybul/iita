-- Events can be marked done (separate from deleted). Boolean column
-- with a default so existing rows don't need backfilling.

alter table public.iita_events
  add column if not exists done boolean not null default false;
