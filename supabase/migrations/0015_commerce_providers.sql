-- E-Commerce Premium: provider-neutral payment, shipping and tax configuration.

create table public.store_payment_methods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  provider text not null,
  display_name text not null,
  enabled boolean not null default false,
  public_config jsonb not null default '{}'::jsonb,
  secret_key_ref text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);
create index store_payment_methods_store_idx on public.store_payment_methods(store_id, enabled, sort_order);

create table public.store_shipping_methods (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  code text not null,
  provider text not null default 'manual',
  display_name text not null,
  enabled boolean not null default false,
  price numeric(18,2) not null default 0 check (price >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  countries jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, code)
);
create index store_shipping_methods_store_idx on public.store_shipping_methods(store_id, enabled, sort_order);

create table public.store_tax_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  rate numeric(8,5) not null default 0 check (rate >= 0 and rate <= 100),
  enabled boolean not null default false,
  tax_inclusive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, country_code)
);
create index store_tax_rules_store_idx on public.store_tax_rules(store_id, enabled);

alter table public.store_payment_methods enable row level security;
alter table public.store_shipping_methods enable row level security;
alter table public.store_tax_rules enable row level security;

create policy "store_payment_methods_select_member"
on public.store_payment_methods for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_payment_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_payment_methods.store_id and sm.user_id = (select auth.uid()))
);
create policy "store_payment_methods_write_admin"
on public.store_payment_methods for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_payment_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_payment_methods.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_payment_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_payment_methods.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
);

create policy "store_shipping_methods_select_member"
on public.store_shipping_methods for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_shipping_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_shipping_methods.store_id and sm.user_id = (select auth.uid()))
);
create policy "store_shipping_methods_write_admin"
on public.store_shipping_methods for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_shipping_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_shipping_methods.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_shipping_methods.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_shipping_methods.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
);

create policy "store_tax_rules_select_member"
on public.store_tax_rules for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_tax_rules.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_tax_rules.store_id and sm.user_id = (select auth.uid()))
);
create policy "store_tax_rules_write_admin"
on public.store_tax_rules for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_tax_rules.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_tax_rules.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_tax_rules.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_tax_rules.store_id and sm.user_id = (select auth.uid()) and sm.role = 'admin')
);

grant select, insert, update, delete on public.store_payment_methods to authenticated;
grant select, insert, update, delete on public.store_shipping_methods to authenticated;
grant select, insert, update, delete on public.store_tax_rules to authenticated;

create trigger store_payment_methods_set_updated_at
before update on public.store_payment_methods for each row execute function private.set_updated_at();
create trigger store_shipping_methods_set_updated_at
before update on public.store_shipping_methods for each row execute function private.set_updated_at();
create trigger store_tax_rules_set_updated_at
before update on public.store_tax_rules for each row execute function private.set_updated_at();

-- Seed safe starter configuration for existing stores.
insert into public.store_payment_methods(store_id, code, provider, display_name, enabled, sort_order)
select s.id, 'cod', 'manual', 'Cash on delivery', true, 10
from public.stores s on conflict (store_id, code) do nothing;

insert into public.store_shipping_methods(store_id, code, provider, display_name, enabled, price, currency, countries, sort_order)
select s.id, 'standard', 'manual', 'Standard delivery', true, 0, s.default_currency, '[]'::jsonb, 10
from public.stores s on conflict (store_id, code) do nothing;

create or replace function private.initialize_store_configuration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.store_settings(store_id, theme, seo, checkout, notifications, integrations)
  values (new.id, jsonb_build_object('preset','aura','accent','#73edff','radius','large'), '{}'::jsonb,
    jsonb_build_object('guest_checkout',true,'cod',true,'online_payments',false), '{}'::jsonb, '{}'::jsonb)
  on conflict (store_id) do nothing;

  insert into public.store_public_settings(store_id, theme, homepage, announcement, seo)
  values (new.id, jsonb_build_object('preset','aura','accent','#73edff'),
    jsonb_build_object('hero_title',new.name,'hero_subtitle','Independent commerce, designed for your brand.','sections',jsonb_build_array('hero','featured_products','about','faq')), '', '{}'::jsonb)
  on conflict (store_id) do nothing;

  insert into public.store_feature_flags(store_id, key, enabled, config)
  select new.id, p.key, p.enabled, p.config from public.platform_feature_flags p
  on conflict (store_id, key) do nothing;

  insert into public.store_payment_methods(store_id, code, provider, display_name, enabled, sort_order)
  values (new.id, 'cod', 'manual', 'Cash on delivery', true, 10)
  on conflict (store_id, code) do nothing;

  insert into public.store_shipping_methods(store_id, code, provider, display_name, enabled, price, currency, countries, sort_order)
  values (new.id, 'standard', 'manual', 'Standard delivery', true, 0, new.default_currency, '[]'::jsonb, 10)
  on conflict (store_id, code) do nothing;

  return new;
end;
$$;

revoke all on function private.initialize_store_configuration() from public;