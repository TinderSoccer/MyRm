-- MyRm · one WOD per class: a group's day can hold a WOD for the 7:00 class and another for the 19:00 one.
-- class_time is 'HH:MM' ('' for a WOD posted without a class, as before this migration). Run once, after 0003_wod.sql.

alter table public.wods
  add column class_time text not null default ''
  check (class_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or class_time = '');

alter table public.wods drop constraint wods_group_id_day_key;
alter table public.wods add constraint wods_group_day_class_key unique (group_id, day, class_time);
