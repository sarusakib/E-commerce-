drop policy if exists "reviews_update_customer" on public.product_reviews;
drop policy if exists "reviews_moderate_member" on public.product_reviews;
create policy "reviews_update" on public.product_reviews for update to authenticated
using (
  (status='pending' and exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid())))
  or exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
)
with check (
  (status='pending' and verified_purchase=false and exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid())))
  or exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
);