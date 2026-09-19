-- E-Commerce Premium: granular seller team roles and invitations.

alter type public.store_member_role add value if not exists 'manager';
alter type public.store_member_role add value if not exists 'product_manager';
alter type public.store_member_role add value if not exists 'order_manager';

alter table public.store_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

create table public.store_invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  role public.store_member_role not null default 'staff',
  permissions jsonb not null default '{}'::jsonb,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (role <> 'owner')
);

create unique index store_invites_active_email_uq
  on public.store_invitations(store_id, lower(email))
  where accepted_at is null;

create unique index store_invites_token_hash_uq
  on public.store_invitations(token_hash);

create index store_invites_store_idx
  on public.store_invitations(store_id, created_at desc);

alter table public.store_invitations enable row level security;

create policy "store_invitations_select_admin"
on public.store_invitations for select to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = store_invitations.store_id
      and so.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = store_invitations.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner','admin','manager')
  )
);

create policy "store_invitations_insert_admin"
on public.store_invitations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and role <> 'owner'
  and (
    exists (
      select 1 from public.store_owners so
      where so.store_id = store_invitations.store_id
        and so.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.store_members sm
      where sm.store_id = store_invitations.store_id
        and sm.user_id = (select auth.uid())
        and sm.role in ('owner','admin','manager')
    )
  )
);

create policy "store_invitations_update_admin"
on public.store_invitations for update to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = store_invitations.store_id
      and so.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = store_invitations.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner','admin','manager')
  )
)
with check (
  role <> 'owner'
  and (
    exists (
      select 1 from public.store_owners so
      where so.store_id = store_invitations.store_id
        and so.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.store_members sm
      where sm.store_id = store_invitations.store_id
        and sm.user_id = (select auth.uid())
        and sm.role in ('owner','admin','manager')
    )
  )
);

create policy "store_invitations_delete_admin"
on public.store_invitations for delete to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = store_invitations.store_id
      and so.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = store_invitations.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner','admin','manager')
  )
);

create or replace function public.accept_store_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.store_invitations%rowtype;
  v_user_id uuid := (select auth.uid());
  v_email text := lower(trim(coalesce((select email from auth.users where id = v_user_id), '')));
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(coalesce(p_token, '')) < 40 or length(p_token) > 160 then
    raise exception 'Invalid invitation';
  end if;

  select *
  into v_invite
  from public.store_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now()
  limit 1
  for update;

  if not found then
    raise exception 'Invitation is invalid or expired';
  end if;

  if v_email <> lower(v_invite.email) then
    raise exception 'This invitation belongs to a different email address';
  end if;

  insert into public.store_members(store_id, user_id, role, permissions)
  values (v_invite.store_id, v_user_id, v_invite.role, v_invite.permissions)
  on conflict (store_id, user_id) do update
    set role = excluded.role,
        permissions = excluded.permissions;

  update public.store_invitations
  set accepted_at = now()
  where id = v_invite.id;

  return jsonb_build_object(
    'store_id', v_invite.store_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.accept_store_invite(text) from public, anon;
grant execute on function public.accept_store_invite(text) to authenticated;
