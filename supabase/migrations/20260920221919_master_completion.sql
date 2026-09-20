create table if not exists public.product_models (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  kind text not null default 'ai' check (kind in ('quick','ai','professional')),
  status text not null default 'queued' check (status in ('queued','processing','ready','failed','cancelled')),
  source_image_ids uuid[] not null default '{}',
  model_url text, poster_url text,
  polygon_count integer check (polygon_count is null or polygon_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, product_id, kind)
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  requester_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  subject text not null check (char_length(subject) between 3 and 160),
  body text not null check (char_length(body) between 1 and 10000),
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_balance bigint not null default 0 check (points_balance >= 0),
  tier text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, customer_id)
);
create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  loyalty_account_id uuid not null references public.loyalty_accounts(id) on delete cascade,
  points integer not null check (points <> 0),
  reason text not null,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  channel text not null check (channel in ('email','push','onsite','webhook')),
  status text not null default 'draft' check (status in ('draft','scheduled','running','paused','completed')),
  audience jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  schedule_at timestamptz, started_at timestamptz, completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ab_experiments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft','running','paused','completed')),
  allocation jsonb not null default '{"control":50,"variant":50}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  starts_at timestamptz, ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_order_updates boolean not null default true, email_marketing boolean not null default false,
  push_order_updates boolean not null default true, push_marketing boolean not null default false,
  security_alerts boolean not null default true, updated_at timestamptz not null default now()
);
create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  risk_score numeric(5,2) not null check (risk_score between 0 and 100),
  severity text not null check (severity in ('low','medium','high','critical')),
  reasons jsonb not null default '[]'::jsonb, resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  run_after timestamptz not null default now(), locked_at timestamptz, last_error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists product_models_store_product_idx on public.product_models(store_id, product_id);
create index if not exists product_models_status_idx on public.product_models(status);
create index if not exists support_tickets_store_status_idx on public.support_tickets(store_id, status);
create index if not exists support_tickets_requester_idx on public.support_tickets(requester_user_id, created_at desc);
create index if not exists loyalty_accounts_store_idx on public.loyalty_accounts(store_id);
create index if not exists loyalty_ledger_account_idx on public.loyalty_ledger(loyalty_account_id, created_at desc);
create index if not exists marketing_campaigns_store_status_idx on public.marketing_campaigns(store_id, status);
create index if not exists ab_experiments_store_status_idx on public.ab_experiments(store_id, status);
create index if not exists risk_events_store_created_idx on public.risk_events(store_id, created_at desc);
create index if not exists automation_jobs_pending_idx on public.automation_jobs(status, run_after);

alter table public.product_models enable row level security;
alter table public.support_tickets enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.ab_experiments enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.risk_events enable row level security;
alter table public.automation_jobs enable row level security;

create policy product_models_public_ready on public.product_models for select to anon, authenticated using (
  status='ready' and exists (
    select 1 from public.stores s join public.products p on p.store_id=s.id
    where s.id=product_models.store_id and p.id=product_models.product_id and s.status='active' and p.status='active'
  )
);
create policy product_models_seller_select on public.product_models for select to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()))
);
create policy product_models_seller_write on public.product_models for all to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  created_by=(select auth.uid()) and (
    exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
    or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  )
);
create policy support_tickets_staff_select on public.support_tickets for select to authenticated using (
  requester_user_id=(select auth.uid())
  or exists (select 1 from public.store_owners so where so.store_id=support_tickets.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=support_tickets.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.platform_role in ('admin','support'))
);
create policy support_tickets_requester_insert on public.support_tickets for insert to authenticated with check (requester_user_id=(select auth.uid()));
create policy support_tickets_requester_update on public.support_tickets for update to authenticated using (requester_user_id=(select auth.uid())) with check (requester_user_id=(select auth.uid()));
create policy loyalty_accounts_select on public.loyalty_accounts for select to authenticated using (
  exists (select 1 from public.customers c where c.id=loyalty_accounts.customer_id and c.store_id=loyalty_accounts.store_id and c.auth_user_id=(select auth.uid()))
  or exists (select 1 from public.store_owners so where so.store_id=loyalty_accounts.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=loyalty_accounts.store_id and sm.user_id=(select auth.uid()))
);
create policy loyalty_ledger_select on public.loyalty_ledger for select to authenticated using (
  exists (select 1 from public.loyalty_accounts la join public.customers c on c.id=la.customer_id and c.store_id=la.store_id where la.id=loyalty_ledger.loyalty_account_id and c.auth_user_id=(select auth.uid()))
  or exists (select 1 from public.store_owners so where so.store_id=loyalty_ledger.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=loyalty_ledger.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy marketing_campaigns_store_admin on public.marketing_campaigns for all to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=marketing_campaigns.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=marketing_campaigns.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  created_by=(select auth.uid()) and (
    exists (select 1 from public.store_owners so where so.store_id=marketing_campaigns.store_id and so.owner_id=(select auth.uid()))
    or exists (select 1 from public.store_members sm where sm.store_id=marketing_campaigns.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  )
);
create policy ab_experiments_store_admin on public.ab_experiments for all to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=ab_experiments.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=ab_experiments.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  created_by=(select auth.uid()) and (
    exists (select 1 from public.store_owners so where so.store_id=ab_experiments.store_id and so.owner_id=(select auth.uid()))
    or exists (select 1 from public.store_members sm where sm.store_id=ab_experiments.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  )
);
create policy notification_preferences_own on public.notification_preferences for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy risk_events_store_select on public.risk_events for select to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=risk_events.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=risk_events.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy automation_jobs_store_select on public.automation_jobs for select to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=automation_jobs.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=automation_jobs.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
