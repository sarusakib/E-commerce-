-- E-Commerce Premium: core multi-tenant schema
-- Apply only to the dedicated E-Commerce Supabase project.
-- Every exposed table gets RLS. No service-role or secret values belong here.

create extension if not exists pgcrypto;

create type public.store_status as enum ('draft', 'active', 'paused');
create type public.store_member_role as enum ('owner', 'admin', 'staff');
create type public.product_status as enum ('draft', 'active', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'en',
  default_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  status public.store_status not null default 'draft',
  default_currency text not null default 'USD',
  locale text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (
    slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
  ),
  constraint stores_currency_format check (default_currency ~ '^[A-Z]{3}$')
);

create table public.store_members (
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.store_member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  sku text,
  currency text not null default 'USD',
  price numeric(14,2) not null check (price >= 0),
  compare_at_price numeric(14,2) check (compare_at_price is null or compare_at_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug),
  unique (store_id, sku),
  constraint products_currency_format check (currency ~ '^[A-Z]{3}$')
);

create index stores_owner_id_idx on public.stores(owner_id);
create index store_members_user_id_idx on public.store_members(user_id);
create index products_store_id_status_idx on public.products(store_id, status);

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.store_members enable row level security;
alter table public.products enable row level security;

create policy "profiles_select_self"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_insert_self"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "profiles_update_self"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "stores_select_member"
on public.stores for select
to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1
    from public.store_members sm
    where sm.store_id = stores.id
      and sm.user_id = (select auth.uid())
  )
);

create policy "stores_insert_owner"
on public.stores for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "stores_update_owner"
on public.stores for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "stores_delete_owner"
on public.stores for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "store_members_select_member_or_owner"
on public.store_members for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.stores s
    where s.id = store_members.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "store_members_insert_owner"
on public.store_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.stores s
    where s.id = store_members.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "store_members_update_owner"
on public.store_members for update
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_members.store_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.stores s
    where s.id = store_members.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "store_members_delete_owner"
on public.store_members for delete
to authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_members.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "products_select_member"
on public.products for select
to authenticated
using (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "products_insert_member"
on public.products for insert
to authenticated
with check (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner', 'admin', 'staff')
  )
  or exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "products_update_member"
on public.products for update
to authenticated
using (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner', 'admin', 'staff')
  )
  or exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner', 'admin', 'staff')
  )
  or exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.owner_id = (select auth.uid())
  )
);

create policy "products_delete_owner_admin"
on public.products for delete
to authenticated
using (
  exists (
    select 1
    from public.store_members sm
    where sm.store_id = products.store_id
      and sm.user_id = (select auth.uid())
      and sm.role in ('owner', 'admin')
  )
  or exists (
    select 1
    from public.stores s
    where s.id = products.store_id
      and s.owner_id = (select auth.uid())
  )
);

-- Explicit Data API privileges after RLS.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.store_members to authenticated;
grant select, insert, update, delete on public.products to authenticated;
