-- E-Commerce Premium: developer API and webhook foundation.

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default array['products:read']::text[],
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index api_keys_hash_uq on public.api_keys(key_hash);
create index api_keys_store_active_idx on public.api_keys(store_id, revoked_at, created_at desc);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  url text not null,
  events text[] not null default array['order.created']::text[],
  secret_encrypted text,
  secret_key_version integer not null default 1,
  active boolean not null default false,
  last_delivery_at timestamptz,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (url ~ '^https://')
);
create index webhook_endpoints_store_active_idx on public.webhook_endpoints(store_id, active, created_at desc);

create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  event_type text not null,
  event_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','succeeded','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  response_status integer,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index webhook_deliveries_pending_idx on public.webhook_deliveries(status, next_attempt_at);
create index webhook_deliveries_store_idx on public.webhook_deliveries(store_id, created_at desc);

alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;

create policy "api_keys_select" on public.api_keys for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=api_keys.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=api_keys.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy "api_keys_insert" on public.api_keys for insert to authenticated with check (
  created_by=(select auth.uid()) and
  (exists(select 1 from public.store_owners so where so.store_id=api_keys.store_id and so.owner_id=(select auth.uid()))
   or exists(select 1 from public.store_members sm where sm.store_id=api_keys.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager')))
);
create policy "api_keys_update" on public.api_keys for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=api_keys.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=api_keys.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=api_keys.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=api_keys.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);

create policy "webhook_endpoints_select" on public.webhook_endpoints for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=webhook_endpoints.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=webhook_endpoints.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy "webhook_endpoints_insert" on public.webhook_endpoints for insert to authenticated with check (
  created_by=(select auth.uid()) and
  (exists(select 1 from public.store_owners so where so.store_id=webhook_endpoints.store_id and so.owner_id=(select auth.uid()))
   or exists(select 1 from public.store_members sm where sm.store_id=webhook_endpoints.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager')))
);
create policy "webhook_endpoints_update" on public.webhook_endpoints for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=webhook_endpoints.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=webhook_endpoints.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=webhook_endpoints.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=webhook_endpoints.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy "webhook_endpoints_delete" on public.webhook_endpoints for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=webhook_endpoints.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=webhook_endpoints.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);

create policy "webhook_deliveries_select" on public.webhook_deliveries for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=webhook_deliveries.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=webhook_deliveries.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);

grant select, insert, update on public.api_keys to authenticated;
grant select, insert, update, delete on public.webhook_endpoints to authenticated;
grant select on public.webhook_deliveries to authenticated;

create trigger webhook_endpoints_set_updated_at before update on public.webhook_endpoints for each row execute function private.set_updated_at();

create or replace function private.enqueue_webhook_deliveries()
returns trigger language plpgsql security definer set search_path=public, pg_temp as $$
declare ep public.webhook_endpoints%rowtype;
begin
  for ep in select * from public.webhook_endpoints where store_id=new.store_id and active=true and (events @> array[new.event_type]::text[] or events @> array['*']::text[]) loop
    insert into public.webhook_deliveries(endpoint_id,store_id,event_type,event_id,payload)
    values(ep.id,new.store_id,new.event_type,new.id,jsonb_build_object('event_id',new.id,'event_type',new.event_type,'payload',new.payload,'created_at',new.created_at));
  end loop;
  return new;
end; $$;
revoke all on function private.enqueue_webhook_deliveries() from public;
drop trigger if exists order_events_enqueue_webhooks on public.order_events;
create trigger order_events_enqueue_webhooks after insert on public.order_events for each row execute function private.enqueue_webhook_deliveries();