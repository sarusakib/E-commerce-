-- E-Commerce Premium: protected product media bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'model/gltf-binary',
    'model/gltf+json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_media_insert_store_member" on storage.objects;
drop policy if exists "product_media_select_store_member" on storage.objects;
drop policy if exists "product_media_update_store_member" on storage.objects;
drop policy if exists "product_media_delete_store_member" on storage.objects;

create policy "product_media_insert_store_member"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-media'
  and exists (
    select 1
    from public.products p
    where p.store_id::text = (storage.foldername(name))[1]
      and p.id::text = (storage.foldername(name))[2]
      and (
        exists (select 1 from public.store_owners so where so.store_id = p.store_id and so.owner_id = (select auth.uid()))
        or exists (select 1 from public.store_members sm where sm.store_id = p.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
      )
  )
);

create policy "product_media_select_store_member"
on storage.objects for select
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.products p
    where p.store_id::text = (storage.foldername(name))[1]
      and p.id::text = (storage.foldername(name))[2]
      and (
        exists (select 1 from public.store_owners so where so.store_id = p.store_id and so.owner_id = (select auth.uid()))
        or exists (select 1 from public.store_members sm where sm.store_id = p.store_id and sm.user_id = (select auth.uid()))
      )
  )
);

create policy "product_media_update_store_member"
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.products p
    where p.store_id::text = (storage.foldername(name))[1]
      and p.id::text = (storage.foldername(name))[2]
      and (
        exists (select 1 from public.store_owners so where so.store_id = p.store_id and so.owner_id = (select auth.uid()))
        or exists (select 1 from public.store_members sm where sm.store_id = p.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
      )
  )
)
with check (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.products p
    where p.store_id::text = (storage.foldername(name))[1]
      and p.id::text = (storage.foldername(name))[2]
      and (
        exists (select 1 from public.store_owners so where so.store_id = p.store_id and so.owner_id = (select auth.uid()))
        or exists (select 1 from public.store_members sm where sm.store_id = p.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin','staff'))
      )
  )
);

create policy "product_media_delete_store_member"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-media'
  and exists (
    select 1 from public.products p
    where p.store_id::text = (storage.foldername(name))[1]
      and p.id::text = (storage.foldername(name))[2]
      and (
        exists (select 1 from public.store_owners so where so.store_id = p.store_id and so.owner_id = (select auth.uid()))
        or exists (select 1 from public.store_members sm where sm.store_id = p.store_id and sm.user_id = (select auth.uid()) and sm.role in ('owner','admin'))
      )
  )
);