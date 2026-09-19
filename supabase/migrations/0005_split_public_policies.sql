-- E-Commerce Premium: separate anonymous storefront policies from seller reads.

drop policy if exists "stores_public_active" on public.stores;
drop policy if exists "products_public_active" on public.products;

create policy "stores_public_active"
on public.stores for select
to anon
using (status = 'active');

create policy "products_public_active"
on public.products for select
to anon
using (
  status = 'active'
  and exists (
    select 1 from public.stores s
    where s.id = products.store_id
      and s.status = 'active'
  )
);

revoke select on public.stores from authenticated;
revoke select on public.products from authenticated;