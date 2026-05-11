-- Two checklists shared between paired users: a normal to-do list and
-- a wish list of things to do together. Same shape — one table with a
-- `kind` discriminator keeps queries simple and lets us add a third
-- list type later (groceries, books, etc.) without another migration.

create table if not exists public.iita_list_items (
  id          text not null,
  pair_id     uuid not null references public.iita_pairs(id) on delete cascade,
  kind        text not null check (kind in ('todo', 'wish')),
  title       text not null,
  notes       text,
  done        boolean not null default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (id)
);

create index if not exists iita_list_items_pair_kind_idx
  on public.iita_list_items(pair_id, kind);

alter table public.iita_list_items enable row level security;

drop policy if exists "pair-rw-list" on public.iita_list_items;
create policy "pair-rw-list"
  on public.iita_list_items
  for all
  using  (pair_id in (select public.my_pair_ids()))
  with check (pair_id in (select public.my_pair_ids()));
