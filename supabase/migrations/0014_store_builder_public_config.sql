-- E-Commerce Premium: public storefront builder configuration.

create table public.store_public_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  theme jsonb not null default '{}'::jsonb,
  homepage jsonb not null default '{}'::jsonb,
  announcement text not null default '',
  seo jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_public_settings enable row level security;

create policy "store_public_settings_public_active"
on public.store_public_settings for select
to anon
using (exists (select 1 from public.stores s where s.id = store_public_settings.store_id and s.status = 'active'));

create policy "store_public_settings_select_member"
on public.store_public_settings for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_public_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_public_settings.store_id and sm.user_id = (select auth.uid()))
);

create policy "store_public_settings_write_admin"
on public.store_public_settings for all
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = store_public_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_public_settings.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
)
with check (
  exists (select 1 from public.store_owners so where so.store_id = store_public_settings.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = store_public_settings.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
);

grant select on public.store_public_settings to anon;
grant select, insert, update, delete on public.store_public_settings to authenticated;

create trigger store_public_settings_set_updated_at
before update on public.store_public_settings
for each row execute function private.set_updated_at();

create or replace function private.initialize_store_configuration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.store_settings(store_id, theme, seo, checkout, notifications, integrations)
  values (
    new.id,
    jsonb_build_object('preset','aura','accent','#73edff','radius','large'),
    '{}'::jsonb,
    jsonb_build_object('guest_checkout',true,'cod',true,'online_payments',false),
    '{}'::jsonb,
    '{}'::jsonb
  ) on conflict (store_id) do nothing;

  insert into public.store_public_settings(store_id, theme, homepage, announcement, seo)
  values (
    new.id,
    jsonb_build_object('preset','aura','accent','#73edff'),
    jsonb_build_object(
      'hero_title', new.name,
      'hero_subtitle', 'Independent commerce, designed for your brand.',
      'sections', jsonb_build_array('hero','featured_products','about','faq')
    ),
    '',
    '{}'::jsonb
  ) on conflict (store_id) do nothing;

  insert into public.store_feature_flags(store_id, key, enabled, config)
  select new.id, p.key, p.enabled, p.config
  from public.platform_feature_flags p
  on conflict (store_id, key) do nothing;

  return new;
end;
$$;

revoke all on function private.initialize_store_configuration() from public;

drop trigger if exists stores_initialize_configuration on public.stores;
create trigger stores_initialize_configuration
after insert on public.stores
for each row execute function private.initialize_store_configuration();

-- Backfill configuration rows for stores created before this migration.
insert into public.store_settings(store_id, theme, seo, checkout, notifications, integrations)
select s.id, jsonb_build_object('preset','aura','accent','#73edff','radius','large'), '{}'::jsonb,
  jsonb_build_object('guest_checkout',true,'cod',true,'online_payments',false), '{}'::jsonb, '{}'::jsonb
from public.stores s on conflict (store_id) do nothing;

insert into public.store_public_settings(store_id, theme, homepage, announcement, seo)
select s.id, jsonb_build_object('preset','aura','accent','#73edff'),
  jsonb_build_object('hero_title',s.name,'hero_subtitle','Independent commerce, designed for your brand.','sections',jsonb_build_array('hero','featured_products','about','faq')),'','{}'::jsonb
from public.stores s on conflict (store_id) do nothing;

insert into public.store_feature_flags(store_id, key, enabled, config)
select s.id, p.key, p.enabled, p.config
from public.stores s cross join public.platform_feature_flags p
on conflict (store_id, key) do nothing;