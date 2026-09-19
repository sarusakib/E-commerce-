-- E-Commerce Premium: consolidate SELECT policies and cover order/customer FKs.

-- Customers
drop policy if exists "customers_seller_access" on public.customers;
drop policy if exists "customers_self_select" on public.customers;
create policy "customers_select"
on public.customers for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
  or (select auth.uid()) = customers.auth_user_id
);
create policy "customers_insert_seller"
on public.customers for insert
to authenticated
with check (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
);
create policy "customers_update_seller"
on public.customers for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
);
create policy "customers_delete_seller"
on public.customers for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customers.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customers.store_id and sm.user_id = (select auth.uid()))
);

-- Customer addresses
drop policy if exists "customer_addresses_seller_access" on public.customer_addresses;
drop policy if exists "customer_addresses_self_select" on public.customer_addresses;
create policy "customer_addresses_select"
on public.customer_addresses for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
  or exists (
    select 1 from public.customers c
    where c.id = customer_addresses.customer_id and c.store_id = customer_addresses.store_id and c.auth_user_id = (select auth.uid())
  )
);
create policy "customer_addresses_insert_seller"
on public.customer_addresses for insert
to authenticated
with check (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
);
create policy "customer_addresses_update_seller"
on public.customer_addresses for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
);
create policy "customer_addresses_delete_seller"
on public.customer_addresses for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = customer_addresses.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = customer_addresses.store_id and sm.user_id = (select auth.uid()))
);

-- Orders
drop policy if exists "orders_seller_access" on public.orders;
drop policy if exists "orders_customer_select" on public.orders;
create policy "orders_select"
on public.orders for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
  or exists (
    select 1 from public.customers c
    where c.id = orders.customer_id and c.store_id = orders.store_id and c.auth_user_id = (select auth.uid())
  )
);
create policy "orders_insert_seller"
on public.orders for insert
to authenticated
with check (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
);
create policy "orders_update_seller"
on public.orders for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
);
create policy "orders_delete_seller"
on public.orders for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = orders.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = orders.store_id and sm.user_id = (select auth.uid()))
);

-- Order items
drop policy if exists "order_items_seller_access" on public.order_items;
drop policy if exists "order_items_customer_select" on public.order_items;
create policy "order_items_select"
on public.order_items for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
  or exists (
    select 1 from public.orders o
    join public.customers c on c.id = o.customer_id and c.store_id = o.store_id
    where o.id = order_items.order_id and o.store_id = order_items.store_id and c.auth_user_id = (select auth.uid())
  )
);
create policy "order_items_insert_seller"
on public.order_items for insert
to authenticated
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
);
create policy "order_items_update_seller"
on public.order_items for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
);
create policy "order_items_delete_seller"
on public.order_items for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_items.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_items.store_id and sm.user_id = (select auth.uid()))
);

-- Order events
drop policy if exists "order_events_seller_access" on public.order_events;
drop policy if exists "order_events_customer_select" on public.order_events;
create policy "order_events_select"
on public.order_events for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
  or exists (
    select 1 from public.orders o
    join public.customers c on c.id = o.customer_id and c.store_id = o.store_id
    where o.id = order_events.order_id and o.store_id = order_events.store_id and c.auth_user_id = (select auth.uid())
  )
);
create policy "order_events_insert_seller"
on public.order_events for insert
to authenticated
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
);
create policy "order_events_update_seller"
on public.order_events for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
);
create policy "order_events_delete_seller"
on public.order_events for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = order_events.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = order_events.store_id and sm.user_id = (select auth.uid()))
);

-- Foreign-key covering indexes.
create index if not exists customers_auth_user_id_idx on public.customers(auth_user_id);
create index if not exists customer_addresses_store_customer_idx on public.customer_addresses(store_id, customer_id);
create index if not exists orders_store_customer_idx on public.orders(store_id, customer_id);
create index if not exists order_items_store_order_idx on public.order_items(store_id, order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);
create index if not exists order_items_variant_idx on public.order_items(variant_id);
create index if not exists order_events_store_order_idx on public.order_events(store_id, order_id);