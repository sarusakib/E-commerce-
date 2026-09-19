-- E-Commerce Premium: platform control and extensibility layer.

create type public.platform_role as enum ('user', 'admin', 'support');
alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'user';

-- Prevent ordinary profile owners from editing the privileged platform role.
revoke update on public.profiles from authenticated;
grant update (display_name, locale, default_currency) on public.profiles to authenticated;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.platform_role = 'admin'
  );
$$;

revoke all on function private.is_platform_admin() from public;
grant execute on function private.is_platform_admin() to authenticated;

create table public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  theme jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  checkout jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  integrations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.platform_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.store_feature_flags (
  store_id uuid not null references public.stores(id) on delete cascade,
  key text not null references public.platform_feature_flags(key) on delete cascade,
  enabled boolean,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (store_id, key)
);

create table public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  hostname text not null,
  status text not null default 'pending' check (status in ('pending','verified','active','disabled')),
  verification_method text not null default 'txt' check (verification_method in ('txt','cname')),
  verification_token_hash text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index custom_domains_hostname_uq on public.custom_domains(lower(hostname));
create index custom_domains_store_idx on public.custom_domains(store_id, status);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  store_id uuid references public.stores(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_store_created_idx on public.audit_logs(store_id, created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs(actor_user_id, created_at desc);

alter table public.store_settings enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.store_feature_flags enable row level security;
alter table public.custom_domains enable row level security;
alter table public.audit_logs enable row level security;

create policy "store_settings_select_member"
on public.store_settings for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_settings.store_id and sm.user_id = (select auth.uid()))
);
create policy "store_settings_write_admin"
on public.store_settings for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_settings.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_settings.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
);

create policy "platform_feature_flags_admin"
on public.platform_feature_flags for all
to authenticated
using ((select private.is_platform_admin()))
with check ((select private.is_platform_admin()));

create policy "store_feature_flags_member_select"
on public.store_feature_flags for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_feature_flags.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_feature_flags.store_id and sm.user_id = (select auth.uid()))
);
create policy "store_feature_flags_owner_write"
on public.store_feature_flags for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_feature_flags.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_feature_flags.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_feature_flags.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_feature_flags.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
);

create policy "custom_domains_member_select"
on public.custom_domains for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = custom_domains.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = custom_domains.store_id and sm.user_id = (select auth.uid()))
);
create policy "custom_domains_owner_write"
on public.custom_domains for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = custom_domains.store_id and so.owner_id = (select auth.uid()))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = custom_domains.store_id and so.owner_id = (select auth.uid()))
);

create policy "audit_logs_member_select"
on public.audit_logs for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = audit_logs.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = audit_logs.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
  or (store_id is null and (select private.is_platform_admin()))
);
create policy "audit_logs_member_insert"
on public.audit_logs for insert
to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (
    exists (select 1 from public.store_owners so where so.store_id = audit_logs.store_id and so.owner_id = (select auth.uid()))
    or exists (select 1 from public.store_members sm where sm.store_id = audit_logs.store_id and sm.user_id = (select auth.uid()))
    or (store_id is null and (select private.is_platform_admin()))
  )
);

-- Audit logs are append-only.
revoke update, delete on public.audit_logs from authenticated, anon;

insert into public.platform_feature_flags (key, enabled) values
  ('store_builder', false),
  ('product_variants', true),
  ('checkout', true),
  ('online_payments', false),
  ('reviews', false),
  ('coupons', false),
  ('analytics', false),
  ('ai', false),
  ('3d', false),
  ('ar', false),
  ('custom_domains', false),
  ('pwa', false),
  ('chat', false),
  ('loyalty', false)
on conflict (key) do nothing;

create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function private.set_updated_at();

create trigger platform_feature_flags_set_updated_at
before update on public.platform_feature_flags
for each row execute function private.set_updated_at();

create trigger store_feature_flags_set_updated_at
before update on public.store_feature_flags
for each row execute function private.set_updated_at();

create trigger custom_domains_set_updated_at
before update on public.custom_domains
for each row execute function private.set_updated_at();