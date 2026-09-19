-- E-Commerce Premium: seller team invitations and granular permissions.

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

create policy "store_invitations_select"
on public.store_invitations for select to authenticated
using (
  exists(select 1 from public.store_owners so where so.store_id=store_invitations.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_invitations.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy "store_invitations_insert"
on public.store_invitations for insert to authenticated
with check (
  created_by=(select auth.uid()) and role <> 'owner' and
  (exists(select 1 from public.store_owners so where so.store_id=store_invitations.store_id and so.owner_id=(select auth.uid()))
   or exists(select 1 from public.store_members sm where sm.store_id=store_invitations.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager')))
);
create policy "store_invitations_update"
on public.store_invitations for update to authenticated
using (
  exists(select 1 from public.store_owners so where so.store_id=store_invitations.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_invitations.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
)
with check (role <> 'owner');
create policy "store_invitations_delete"
on public.store_invitations for delete to authenticated
using (
  exists(select 1 from public.store_owners so where so.store_id=store_invitations.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_invitations.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
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
  v_email text := lower(trim(coalesce((select email from auth.users where id=v_user_id),'')));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if length(coalesce(p_token,'')) < 40 or length(p_token) > 160 then raise exception 'Invalid invitation'; end if;

  select * into v_invite from public.store_invitations
  where token_hash=encode(digest(p_token,'sha256'),'hex')
    and accepted_at is null and expires_at>now()
  limit 1 for update;

  if not found then raise exception 'Invitation is invalid or expired'; end if;
  if v_email <> lower(v_invite.email) then raise exception 'This invitation belongs to a different email address'; end if;

  insert into public.store_members(store_id,user_id,role,permissions)
  values(v_invite.store_id,v_user_id,v_invite.role,v_invite.permissions)
  on conflict(store_id,user_id) do update set role=excluded.role, permissions=excluded.permissions;

  update public.store_invitations set accepted_at=now() where id=v_invite.id;
  insert into public.notifications(store_id,user_id,type,title,body,data)
  values(v_invite.store_id,v_invite.created_by,'team.invite.accepted','Team invitation accepted','An invited team member joined the store.',jsonb_build_object('store_id',v_invite.store_id,'role',v_invite.role));

  return jsonb_build_object('store_id',v_invite.store_id,'role',v_invite.role);
end;
$$;

revoke all on function public.accept_store_invite(text) from public, anon;
grant execute on function public.accept_store_invite(text) to authenticated;

-- Granular member-management roles.
drop policy if exists "store_members_insert_owner" on public.store_members;
drop policy if exists "store_members_update_owner" on public.store_members;
create policy "store_members_insert_owner" on public.store_members for insert to authenticated with check (
  role <> 'owner' and
  exists(select 1 from public.store_owners so where so.store_id=store_members.store_id and so.owner_id=(select auth.uid()))
);
create policy "store_members_update_owner" on public.store_members for update to authenticated using (
  role <> 'owner' and
  exists(select 1 from public.store_owners so where so.store_id=store_members.store_id and so.owner_id=(select auth.uid()))
) with check (role <> 'owner' and exists(select 1 from public.store_owners so where so.store_id=store_members.store_id and so.owner_id=(select auth.uid())));

-- Product permissions: product managers and store managers can manage catalog.
drop policy if exists "products_insert_member" on public.products;
drop policy if exists "products_update_member" on public.products;
drop policy if exists "products_delete_owner_admin" on public.products;
drop policy if exists "products_delete_admin" on public.products;
create policy "products_insert_member" on public.products for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=products.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=products.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','product_manager','staff'))
);
create policy "products_update_member" on public.products for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=products.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=products.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','product_manager','staff'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=products.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=products.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','product_manager','staff'))
);
create policy "products_delete_owner_admin" on public.products for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=products.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=products.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','product_manager'))
);

-- Order changes restricted to order-capable roles.
drop policy if exists "orders_insert_seller" on public.orders;
drop policy if exists "orders_update_seller" on public.orders;
drop policy if exists "orders_delete_seller" on public.orders;
create policy "orders_insert_seller" on public.orders for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=orders.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=orders.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','order_manager'))
);
create policy "orders_update_seller" on public.orders for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=orders.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=orders.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','order_manager'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=orders.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=orders.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager','order_manager'))
);
create policy "orders_delete_seller" on public.orders for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=orders.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=orders.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);

-- Review moderation includes store managers.
drop policy if exists "reviews_update" on public.product_reviews;
create policy "reviews_update" on public.product_reviews for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);