-- E-Commerce Premium: variant and media foundation.

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  sku text,
  barcode text,
  option_values jsonb not null default '{}'::jsonb,
  price numeric(18,2) not null check (price >= 0),
  compare_at_price numeric(18,2) check (compare_at_price is null or compare_at_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  weight_grams numeric(12,3) check (weight_grams is null or weight_grams >= 0),
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, product_id, id)
);

create unique index product_variants_store_sku_uq
  on public.product_variants(store_id, sku)
  where sku is not null;
create index product_variants_product_id_idx on public.product_variants(product_id, sort_order);
create index product_variants_store_id_idx on public.product_variants(store_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  public_url text,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images(product_id, sort_order);
create index product_images_store_id_idx on public.product_images(store_id);

alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "product_variants_select_member_or_owner"
on public.product_variants for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_variants.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_variants.store_id and sm.user_id = (select auth.uid()))
);

create policy "product_variants_insert_member"
on public.product_variants for insert
to authenticated
with check (
  (exists (select 1 from public.store_owners so where so.store_id = product_variants.store_id and so.owner_id = (select auth.uid())))
  or exists (select 1 from public.store_members sm where sm.store_id = product_variants.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
  and exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = product_variants.store_id)
);

create policy "product_variants_update_member"
on public.product_variants for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_variants.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_variants.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
)
with check (
  (exists (select 1 from public.store_owners so where so.store_id = product_variants.store_id and so.owner_id = (select auth.uid())))
  or exists (select 1 from public.store_members sm where sm.store_id = product_variants.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
  and exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = product_variants.store_id)
);

create policy "product_variants_delete_member"
on public.product_variants for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_variants.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_variants.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
);

create policy "product_variants_public_active"
on public.product_variants for select
to anon
using (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = product_variants.product_id
      and p.store_id = product_variants.store_id
      and p.status = 'active'
      and s.status = 'active'
  )
);

create policy "product_images_select_member_or_owner"
on public.product_images for select
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_images.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_images.store_id and sm.user_id = (select auth.uid()))
);

create policy "product_images_insert_member"
on public.product_images for insert
to authenticated
with check (
  (exists (select 1 from public.store_owners so where so.store_id = product_images.store_id and so.owner_id = (select auth.uid())))
  or exists (select 1 from public.store_members sm where sm.store_id = product_images.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
  and exists (select 1 from public.products p where p.id = product_images.product_id and p.store_id = product_images.store_id)
);

create policy "product_images_update_member"
on public.product_images for update
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_images.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_images.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
)
with check (
  (exists (select 1 from public.store_owners so where so.store_id = product_images.store_id and so.owner_id = (select auth.uid())))
  or exists (select 1 from public.store_members sm where sm.store_id = product_images.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
  and exists (select 1 from public.products p where p.id = product_images.product_id and p.store_id = product_images.store_id)
);

create policy "product_images_delete_member"
on public.product_images for delete
to authenticated
using (
  exists (select 1 from public.store_owners so where so.store_id = product_images.store_id and so.owner_id = (select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id = product_images.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
);

create policy "product_images_public_active"
on public.product_images for select
to anon
using (
  exists (
    select 1 from public.products p
    join public.stores s on s.id = p.store_id
    where p.id = product_images.product_id
      and p.store_id = product_images.store_id
      and p.status = 'active'
      and s.status = 'active'
  )
);

grant select on public.product_variants to anon;
grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_variants to authenticated;
grant select, insert, update, delete on public.product_images to authenticated;

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function private.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function private.set_updated_at();