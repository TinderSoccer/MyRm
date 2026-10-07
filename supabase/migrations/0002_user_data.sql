-- MyRm · personal backup: each person's marks, skills, reminders and settings, as one JSON copy per account.
-- Only the owner can read or write it. Run once in the Supabase SQL editor, after 0001_group.sql.

create table public.user_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "read own data" on public.user_data for select using (user_id = auth.uid());
create policy "create own data" on public.user_data for insert with check (user_id = auth.uid());
create policy "update own data" on public.user_data for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own data" on public.user_data for delete using (user_id = auth.uid());
