-- MyRm · a nickname for the day's WOD: the AI invents one in Chilean box humour when it reads the board photo (or on
-- request), the poster can change it, and the whole group sees it under the real name. Run once, after 0003_wod.sql.

alter table public.wods
  add column nickname text not null default '' check (char_length(nickname) <= 40);
