-- E-Commerce Premium: reviews, notifications and analytics event foundation.

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null,
  customer_id uuid not null,
  order_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  media jsonb not null default '[]'::jsonb,
  verified_purchase boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','rejected','hidden')),
  seller_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_reviews_product_store_fk foreign key(store_id, product_id) references public.products(store_id,id) on delete cascade,
  constraint product_reviews_customer_store_fk foreign key(store_id, customer_id) references public.customers(store_id,id) on delete cascade,
  constraint product_reviews_order_store_fk foreign key(store_id, order_id) references public.orders(store_id,id) on delete cascade
);

create unique index product_reviews_customer_order_product_uq on public.product_reviews(store_id, product_id, customer_id, order_id);
create index product_reviews_product_status_idx on public.product_reviews(product_id, status, created_at desc);
create index product_reviews_store_status_idx on public.product_reviews(store_id, status, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index notifications_store_created_idx on public.notifications(store_id, created_at desc);

create table public.analytics_events (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  session_id text not null,
  event_name text not null,
  path text not null default '',
  product_id uuid,
  order_id uuid,
  value numeric(18,2),
  currency text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_product_store_fk foreign key(store_id, product_id) references public.products(store_id,id) on delete set null,
  constraint analytics_events_order_store_fk foreign key(store_id, order_id) references public.orders(store_id,id) on delete set null
);
create index analytics_events_store_time_idx on public.analytics_events(store_id, created_at desc);
create index analytics_events_store_name_time_idx on public.analytics_events(store_id, event_name, created_at desc);

alter table public.product_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;

create policy "reviews_public_published" on public.product_reviews for select to anon using (status='published');
create policy "reviews_select_member_or_customer" on public.product_reviews for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()))
  or exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()))
);
create policy "reviews_insert_customer" on public.product_reviews for insert to authenticated with check (
  exists(select 1 from public.customers c join public.orders o on o.customer_id=c.id and o.store_id=c.store_id join public.order_items oi on oi.order_id=o.id and oi.store_id=o.store_id and oi.product_id=product_reviews.product_id where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()) and o.id=product_reviews.order_id and o.status <> 'cancelled')
);
create policy "reviews_update_customer" on public.product_reviews for update to authenticated using (
  exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()))
) with check (
  exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()))
);
create policy "reviews_moderate_member" on public.product_reviews for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
);

create policy "notifications_user_select" on public.notifications for select to authenticated using ((select auth.uid())=user_id);
create policy "notifications_user_update" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "notifications_seller_insert" on public.notifications for insert to authenticated with check (
  (user_id is not null and (select auth.uid())=user_id) or
  (store_id is not null and (exists(select 1 from public.store_owners so where so.store_id=notifications.store_id and so.owner_id=(select auth.uid())) or exists(select 1 from public.store_members sm where sm.store_id=notifications.store_id and sm.user_id=(select auth.uid()))))
);

create policy "analytics_seller_select" on public.analytics_events for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=analytics_events.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=analytics_events.store_id and sm.user_id=(select auth.uid()))
);
grant select on public.product_reviews to anon;
grant select, insert, update on public.product_reviews to authenticated;
grant select, update, insert on public.notifications to authenticated;
grant select on public.analytics_events to authenticated;

create trigger product_reviews_set_updated_at before update on public.product_reviews for each row execute function private.set_updated_at();

create or replace function private.notify_order_created()
returns trigger language plpgsql security definer set search_path=public, pg_temp as $$
declare v_owner uuid;
begin
  select so.owner_id into v_owner from public.store_owners so where so.store_id=new.store_id;
  if v_owner is not null then
    insert into public.notifications(store_id,user_id,type,title,body,data)
    values(new.store_id,v_owner,'order.created','New order','Order #'||new.order_number||' was created.',jsonb_build_object('order_id',new.id));
  end if;
  return new;
end; $$;
revoke all on function private.notify_order_created() from public;
drop trigger if exists orders_notify_owner on public.orders;
create trigger orders_notify_owner after insert on public.orders for each row execute function private.notify_order_created();