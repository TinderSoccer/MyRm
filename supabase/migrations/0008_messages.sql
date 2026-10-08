-- MyRm · group messages: a word of encouragement or a joke for the group, or for one person in it. Not a chat: no
-- replies and no threads, only emoji reactions. Messages stay; the app shows the latest on top of "Hoy".
-- Run once in the Supabase SQL editor, after 0001_group.sql.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  -- Dedicated to someone in the group ("Cata → Vale"); null is for everyone.
  to_user uuid references auth.users on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now()
);
create index on public.messages (group_id, created_at desc);

create table public.message_reactions (
  message_id uuid not null references public.messages on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  emoji text not null check (emoji in ('👏', '💪', '😂', '🔥')),
  primary key (message_id, user_id, emoji)
);

alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

create policy "members read messages" on public.messages for select using (public.is_member(group_id));
create policy "write as yourself, to your group" on public.messages for insert
  with check (
    user_id = auth.uid() and public.is_member(group_id)
    and (to_user is null or exists (select 1 from public.group_members m where m.group_id = messages.group_id and m.user_id = to_user))
  );
create policy "delete own messages" on public.messages for delete using (user_id = auth.uid());

create policy "members see reactions" on public.message_reactions for select
  using (exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.group_id)));
create policy "react as yourself" on public.message_reactions for insert
  with check (user_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id and public.is_member(m.group_id)));
create policy "take back a reaction" on public.message_reactions for delete using (user_id = auth.uid());
