-- MyRm · the person who created a group can take someone out of it (before, only you could leave). Renaming was
-- already theirs (0001). The person removed stops seeing the group; their own marks are untouched, and an invite
-- link lets them back in. Run once, after 0001_group.sql.

create policy "creator removes members" on public.group_members for delete
  using (exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()));
