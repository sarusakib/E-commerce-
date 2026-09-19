-- E-Commerce Premium: owner-membership hardening.

drop policy if exists "store_members_insert_owner" on public.store_members;
drop policy if exists "store_members_update_owner" on public.store_members;
drop policy if exists "store_members_delete_owner" on public.store_members;

create policy "store_members_insert_owner"
on public.store_members for insert
to authenticated
with check (
  role in ('admin', 'staff')
  and exists (
    select 1 from public.store_owners so
    where so.store_id = store_members.store_id
      and so.owner_id = (select auth.uid())
  )
);

create policy "store_members_update_owner"
on public.store_members for update
to authenticated
using (
  role <> 'owner'
  and exists (
    select 1 from public.store_owners so
    where so.store_id = store_members.store_id
      and so.owner_id = (select auth.uid())
  )
)
with check (
  role in ('admin', 'staff')
  and exists (
    select 1 from public.store_owners so
    where so.store_id = store_members.store_id
      and so.owner_id = (select auth.uid())
  )
);

create policy "store_members_delete_owner"
on public.store_members for delete
to authenticated
using (
  role <> 'owner'
  and exists (
    select 1 from public.store_owners so
    where so.store_id = store_members.store_id
      and so.owner_id = (select auth.uid())
  )
);