-- MyRm · room for the whole whiteboard: warm-up, strength and the WOD, each part under its own header.
-- The description grows from 600 to 1500 characters. Run once, after 0003_wod.sql.

alter table public.wods drop constraint if exists wods_description_check;
alter table public.wods add constraint wods_description_check check (char_length(description) <= 1500);
