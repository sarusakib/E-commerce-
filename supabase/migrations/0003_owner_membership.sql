-- E-Commerce Premium: complete initial owner membership.
-- Every newly created store gets both its ownership binding and an owner membership row.

create or replace function private.assign_store_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.store_owners (store_id, owner_id)
  values (new.id, auth.uid())
  on conflict (store_id) do nothing;

  insert into public.store_members (store_id, user_id, role)
  values (new.id, auth.uid(), 'owner')
  on conflict (store_id, user_id) do update
    set role = 'owner';

  return new;
end;
$$;

revoke all on function private.assign_store_owner() from public;

-- Backfill owner membership for any stores that already existed before this trigger upgrade.
insert into public.store_members (store_id, user_id, role)
select so.store_id, so.owner_id, 'owner'::public.store_member_role
from public.store_owners so
on conflict (store_id, user_id) do update
  set role = 'owner';

create index if not exists products_store_id_updated_at_idx
  on public.products(store_id, updated_at desc);
