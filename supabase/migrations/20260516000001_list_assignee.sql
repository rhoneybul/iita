-- Allow a to-do (or wish) to be assigned to one of the two pair members.
-- Null = unassigned ("either of us"). On account deletion we keep the
-- task but clear the assignee.

alter table public.iita_list_items
  add column if not exists assigned_to uuid references auth.users(id) on delete set null;
