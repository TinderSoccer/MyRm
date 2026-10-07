-- MyRm · events can now be edited from the app: an edited event must stay in a group its creator belongs to.
-- Without WITH CHECK, an update could move an event into another group. Run once, after 0001_group.sql.

drop policy "creator edits event" on public.events;
create policy "creator edits event" on public.events for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid() and public.is_member(group_id));
