-- MyRm · the group's WOD board: one WOD per group per day, and each person's score on it.
-- Run once in the Supabase SQL editor, after 0001_group.sql.

create table public.wods (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  day date not null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 600),
  score_type text not null check (score_type in ('time', 'reps', 'kg')),
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, day)
);

create table public.wod_scores (
  wod_id uuid not null references public.wods on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  value numeric not null check (value >= 0),     -- seconds, reps/rounds, or kg
  scaled boolean not null default false,
  note text not null default '' check (char_length(note) <= 120),
  created_at timestamptz not null default now(),
  primary key (wod_id, user_id)
);

alter table public.wods enable row level security;
alter table public.wod_scores enable row level security;

create policy "members see wods" on public.wods for select using (public.is_member(group_id));
create policy "members post the wod" on public.wods for insert with check (created_by = auth.uid() and public.is_member(group_id));
create policy "author edits wod" on public.wods for update using (created_by = auth.uid());
create policy "author deletes wod" on public.wods for delete using (created_by = auth.uid());

create policy "members see scores" on public.wod_scores for select
  using (exists (select 1 from public.wods w where w.id = wod_id and public.is_member(w.group_id)));
create policy "score as yourself" on public.wod_scores for insert
  with check (user_id = auth.uid() and exists (select 1 from public.wods w where w.id = wod_id and public.is_member(w.group_id)));
create policy "change own score" on public.wod_scores for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "drop own score" on public.wod_scores for delete using (user_id = auth.uid());
