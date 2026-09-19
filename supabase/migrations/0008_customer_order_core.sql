-- E-Commerce Premium: customer and order foundation.
-- Orders are intentionally server-controlled; no anonymous write policy is added here.

create type public.order_status as enum (
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
  'refunded'
);

create type public.payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'partially_refunded',
  'refunded'
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_store_id_id_uq unique (store_id, id)
);

create unique index customers_store_email_uq
  on public.customers(store_id, lower(email));
create unique index customers_store_auth_user_uq
  on public.customers(store_id, auth_user_id)
  where auth_user_id is not null;
create index customers_store_id_idx on public.customers(store_id, created_at desc);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null,
  label text not null default 'Shipping',
  recipient_name text not null default '',
  phone text not null default '',
  country_code text not null default 'BD',
  state text not null default '',
  city text not null default '',
  line1 text not null default '',
  line2 text not null default '',
  postal_code text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_customer_store_fk
    foreign key (store_id, customer_id)
    references public.customers(store_id, id)
    on delete cascade
);

create index customer_addresses_customer_idx on public.customer_addresses(customer_id, is_default desc);
create index customer_addresses_store_customer_idx on public.customer_addresses(store_id, customer_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid,
  order_number text not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal numeric(18,2) not null default 0 check (subtotal >= 0),
  discount_total numeric(18,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(18,2) not null default 0 check (tax_total >= 0),
  shipping_total numeric(18,2) not null default 0 check (shipping_total >= 0),
  grand_total numeric(18,2) not null default 0 check (grand_total >= 0),
  customer_email text not null,
  customer_phone text not null default '',
  shipping_address jsonb not null default '{}'::jsonb,
  billing_address jsonb not null default '{}'::jsonb,
  notes text not null default '',
  tracking_number text,
  payment_provider text,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_customer_store_fk
    foreign key (store_id, customer_id)
    references public.customers(store_id, id)
    on delete set null,
  constraint orders_store_id_id_uq unique (store_id, id)
);

create unique index orders_store_order_number_uq on public.orders(store_id, order_number);
create index orders_store_created_idx on public.orders(store_id, created_at desc);
create index orders_store_status_idx on public.orders(store_id, status, created_at desc);
create index orders_customer_idx on public.orders(customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  discount_total numeric(18,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(18,2) not null default 0 check (tax_total >= 0),
  line_total numeric(18,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_order_store_fk
    foreign key (store_id, order_id)
    references public.orders(store_id, id)
    on delete cascade
);

create index order_items_order_idx on public.order_items(order_id);
create index order_items_store_idx on public.order_items(store_id, created_at desc);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint order_events_order_store_fk
    foreign key (store_id, order_id)
    references public.orders(store_id, id)
    on delete cascade
);

create index order_events_order_idx on public.order_events(order_id, created_at desc);
create index order_events_store_idx on public.order_events(store_id, created_at desc);

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy "customers_seller_access"
on public.customers for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
);

create policy "customers_self_select"
on public.customers for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create policy "customer_addresses_seller_access"
on public.customer_addresses for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
);

create policy "customer_addresses_self_select"
on public.customer_addresses for select
to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id
      and c.store_id = customer_addresses.store_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "orders_seller_access"
on public.orders for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
);

create policy "orders_customer_select"
on public.orders for select
to authenticated
using (
  exists (
    select 1 from public.customers c
    where c.id = orders.customer_id
      and c.store_id = orders.store_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "order_items_seller_access"
on public.order_items for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
);

create policy "order_items_customer_select"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id and c.store_id = o.store_id
    where o.id = order_items.order_id
      and o.store_id = order_items.store_id
      and c.auth_user_id = (select auth.uid())
  )
);

create policy "order_events_seller_access"
on public.order_events for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
);

create policy "order_events_customer_select"
on public.order_events for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id and c.store_id = o.store_id
    where o.id = order_events.order_id
      and o.store_id = order_events.store_id
      and c.auth_user_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.order_events to authenticated;

create trigger customers_set_updated_at
before update on public.customers
for each row execute function private.set_updated_at();

create trigger customer_addresses_set_updated_at
before update on public.customer_addresses
for each row execute function private.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function private.set_updated_at();

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function private.set_updated_at();