-- E-Commerce Premium: auth hardening + public storefront projection rules
-- This migration is safe for the current empty/new core database and remains data-preserving.

create schema if not exists private;
revoke all on schema private from public;

create table public.store_owners (
  store_id uuid primary key references public.stores(id) on delete cascade,
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

insert into public.store_owners (store_id, owner_id)
select id, owner_id
from public.stores
on conflict (store_id) do nothing;

drop policy if exists "stores_select_member" on public.stores;
drop policy if exists "stores_insert_owner" on public.stores;
drop policy if exists "stores_update_owner" on public.stores;
drop policy if exists "stores_delete_owner" on public.stores;

alter table public.stores drop constraint if exists stores_owner_id_fkey;
alter table public.stores drop column if exists owner_id;

create index store_owners_owner_id_idx on public.store_owners(owner_id);

alter table public.store_owners enable row level security;

create policy "store_owners_select_owner"
on public.store_owners for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "store_owners_insert_owner"
on public.store_owners for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "store_owners_update_owner"
on public.store_owners for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "store_owners_delete_owner"
on public.store_owners for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "stores_select_owner_or_member"
on public.stores for select
to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
      and so.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.store_members sm
    where sm.store_id = stores.id
      and sm.user_id = (select auth.uid())
  )
);

create policy "stores_insert_via_owner"
on public.stores for insert
to authenticated
with check (
  exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
      and so.owner_id = (select auth.uid())
  )
  or not exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
  )
);

create policy "stores_update_owner"
on public.stores for update
to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
      and so.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
      and so.owner_id = (select auth.uid())
  )
);

create policy "stores_delete_owner"
on public.stores for delete
to authenticated
using (
  exists (
    select 1 from public.store_owners so
    where so.store_id = stores.id
      and so.owner_id = (select auth.uid())
  )
);

create policy "stores_public_active"
on public.stores for select
to anon
using (status = 'active');

create policy "products_public_active"
on public.products for select
to anon
using (
  status = 'active'
  and exists (
    select 1 from public.stores s
    where s.id = products.store_id
      and s.status = 'active'
  )
);

alter table public.store_owners enable row level security;

grant select on public.stores to anon;
grant select on public.products to anon;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do update
    set display_name = coalesce(
      public.profiles.display_name,
      excluded.display_name
    ),
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
before update on public.stores
for each row execute function private.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();

alter table public.stores
  add column if not exists description text not null default '',
  add column if not exists logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists country_code text not null default 'BD';

alter table public.products
  add column if not exists brand text,
  add column if not exists category text,
  add column if not exists primary_image_url text,
  add column if not exists seo_title text,
  add column if not exists seo_description text;

alter table public.stores
  drop constraint if exists stores_reserved_slug_check;

alter table public.stores
  add constraint stores_reserved_slug_check
  check (slug not in (
    'admin','api','app','auth','cdn','dashboard','help','login','mail',
    'settings','shop','static','store','support','www'
  ));

grant select, insert, update, delete on public.store_owners to authenticated;
