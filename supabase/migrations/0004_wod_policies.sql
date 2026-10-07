-- MyRm · tighten the WOD board's edit rules: an edited WOD or score must still belong to a group you're in.
-- Without WITH CHECK, an update could move a row into another group. Run once, after 0003_wod.sql.

drop policy "author edits wod" on public.wods;
create policy "author edits wod" on public.wods for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and public.is_member(group_id));

drop policy "change own score" on public.wod_scores;
create policy "change own score" on public.wod_scores for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.wods w where w.id = wod_id and public.is_member(w.group_id)));
