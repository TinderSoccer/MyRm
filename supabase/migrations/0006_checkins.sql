-- MyRm · class check-ins: "I came today, at this class, feeling like this", and how it ended.
-- A check-in is the light way to take part: no score needed. Mood is 1 (low) to 5 (high), shown to the group as emoji.
-- Run once in the Supabase SQL editor, after 0001_group.sql.

create table public.checkins (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  class_time text not null default '' check (class_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or class_time = ''),
  mood_in smallint not null check (mood_in between 1 and 5),
  mood_out smallint check (mood_out between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id, day)
);
create index on public.checkins (group_id, day);

alter table public.checkins enable row level security;

create policy "members see check-ins" on public.checkins for select using (public.is_member(group_id));
create policy "check in as yourself" on public.checkins for insert
  with check (user_id = auth.uid() and public.is_member(group_id));
create policy "change own check-in" on public.checkins for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(group_id));
create policy "drop own check-in" on public.checkins for delete using (user_id = auth.uid());
