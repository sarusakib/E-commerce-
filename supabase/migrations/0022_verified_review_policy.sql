drop policy if exists "reviews_insert_customer" on public.product_reviews;
drop policy if exists "reviews_update_customer" on public.product_reviews;
drop policy if exists "reviews_update" on public.product_reviews;
create policy "reviews_insert_customer" on public.product_reviews for insert to authenticated with check (
  verified_purchase = true and status = 'pending'
  and exists (
    select 1 from public.customers c
    join public.orders o on o.customer_id=c.id and o.store_id=c.store_id
    join public.order_items oi on oi.order_id=o.id and oi.store_id=o.store_id and oi.product_id=product_reviews.product_id
    where c.id=product_reviews.customer_id
      and c.store_id=product_reviews.store_id
      and c.auth_user_id=(select auth.uid())
      and o.id=product_reviews.order_id
      and o.status='delivered'
  )
);
create policy "reviews_update" on public.product_reviews for update to authenticated
using (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
)
with check (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
);