-- MyRm · shared group: profiles, groups, feed, cheers, events and RSVPs.
-- Personal marks, skills and reminders stay on each phone; only what is posted to the group lives here.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ─── tables ────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '' check (char_length(name) <= 60),
  birthday text check (birthday ~ '^\d{2}-\d{2}$'),          -- MM-DD, the year doesn't matter
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  -- Short, unguessable enough for a box crew; no extension needed (Supabase keeps pgcrypto outside public).
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 10),
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create table public.feed_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('pr', 'skill')),
  disc text not null,
  what text not null check (char_length(what) <= 80),
  type text check (type in ('kg', 'time', 'reps')),
  unit_label text,
  value numeric,
  stage text,
  created_at timestamptz not null default now()
);
create index on public.feed_items (group_id, created_at desc);

create table public.cheers (
  feed_item_id uuid not null references public.feed_items on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (feed_item_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  created_by uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('carrete', 'competencia', 'otro')),
  title text not null check (char_length(title) between 1 and 80),
  day date not null,
  time text not null default '',
  place text not null default '' check (char_length(place) <= 120),
  created_at timestamptz not null default now()
);
create index on public.events (group_id, day);

create table public.rsvps (
  event_id uuid not null references public.events on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  going boolean not null,
  primary key (event_id, user_id)
);

-- ─── membership helpers (security definer so policies don't recurse) ─────

create or replace function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = auth.uid());
$$;

create or replace function public.shares_group(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Create a group and join it as its first member.
create or replace function public.create_group(group_name text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into groups (name, created_by) values (group_name, auth.uid()) returning * into g;
  insert into group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end $$;

-- Join through an invite link's code. Idempotent.
create or replace function public.join_group(code text) returns public.groups
language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from groups where invite_code = lower(trim(code));
  if g.id is null then raise exception 'invalid invite code'; end if;
  insert into group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end $$;

-- ─── row level security ────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.feed_items enable row level security;
alter table public.cheers enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

create policy "see own and groupmates' profiles" on public.profiles for select
  using (id = auth.uid() or public.shares_group(id));
create policy "write own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "members see their groups" on public.groups for select using (public.is_member(id));
create policy "creator renames group" on public.groups for update using (created_by = auth.uid());

create policy "members see members" on public.group_members for select using (public.is_member(group_id));
create policy "leave a group" on public.group_members for delete using (user_id = auth.uid());

create policy "members read feed" on public.feed_items for select using (public.is_member(group_id));
create policy "post own feed items" on public.feed_items for insert with check (user_id = auth.uid() and public.is_member(group_id));
create policy "delete own feed items" on public.feed_items for delete using (user_id = auth.uid());

create policy "members see cheers" on public.cheers for select
  using (exists (select 1 from feed_items f where f.id = feed_item_id and public.is_member(f.group_id)));
create policy "cheer as yourself" on public.cheers for insert
  with check (user_id = auth.uid() and exists (select 1 from feed_items f where f.id = feed_item_id and public.is_member(f.group_id)));
create policy "uncheer" on public.cheers for delete using (user_id = auth.uid());

create policy "members see events" on public.events for select using (public.is_member(group_id));
create policy "members create events" on public.events for insert with check (created_by = auth.uid() and public.is_member(group_id));
create policy "creator edits event" on public.events for update using (created_by = auth.uid());
create policy "creator deletes event" on public.events for delete using (created_by = auth.uid());

create policy "members see rsvps" on public.rsvps for select
  using (exists (select 1 from events e where e.id = event_id and public.is_member(e.group_id)));
create policy "rsvp as yourself" on public.rsvps for insert
  with check (user_id = auth.uid() and exists (select 1 from events e where e.id = event_id and public.is_member(e.group_id)));
create policy "change own rsvp" on public.rsvps for update using (user_id = auth.uid());
create policy "drop own rsvp" on public.rsvps for delete using (user_id = auth.uid());

grant execute on function public.create_group(text), public.join_group(text) to authenticated;
