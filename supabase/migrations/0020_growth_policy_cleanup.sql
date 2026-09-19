-- E-Commerce Premium: consolidate growth RLS policies and cover foreign keys.

-- Coupons: one SELECT policy, writes remain admin-only.
drop policy if exists "coupons_select_member" on public.coupons;
drop policy if exists "coupons_write_admin" on public.coupons;
create policy "coupons_select" on public.coupons for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()))
);
create policy "coupons_insert" on public.coupons for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "coupons_update" on public.coupons for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "coupons_delete" on public.coupons for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Custom domains.
drop policy if exists "custom_domains_member_select" on public.custom_domains;
drop policy if exists "custom_domains_owner_write" on public.custom_domains;
create policy "custom_domains_select" on public.custom_domains for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=custom_domains.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=custom_domains.store_id and sm.user_id=(select auth.uid()))
);
create policy "custom_domains_insert" on public.custom_domains for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=custom_domains.store_id and so.owner_id=(select auth.uid()))
);
create policy "custom_domains_update" on public.custom_domains for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=custom_domains.store_id and so.owner_id=(select auth.uid()))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=custom_domains.store_id and so.owner_id=(select auth.uid()))
);
create policy "custom_domains_delete" on public.custom_domains for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=custom_domains.store_id and so.owner_id=(select auth.uid()))
);

-- Store feature flags.
drop policy if exists "store_feature_flags_member_select" on public.store_feature_flags;
drop policy if exists "store_feature_flags_owner_write" on public.store_feature_flags;
create policy "store_feature_flags_select" on public.store_feature_flags for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_feature_flags.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_feature_flags.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_feature_flags_insert" on public.store_feature_flags for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_feature_flags.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_feature_flags.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_feature_flags_update" on public.store_feature_flags for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_feature_flags.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_feature_flags.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_feature_flags.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_feature_flags.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_feature_flags_delete" on public.store_feature_flags for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_feature_flags.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_feature_flags.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Store payment methods.
drop policy if exists "store_payment_methods_select_member" on public.store_payment_methods;
drop policy if exists "store_payment_methods_write_admin" on public.store_payment_methods;
create policy "store_payment_methods_select" on public.store_payment_methods for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_payment_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_payment_methods.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_payment_methods_insert" on public.store_payment_methods for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_payment_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_payment_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_payment_methods_update" on public.store_payment_methods for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_payment_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_payment_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_payment_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_payment_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_payment_methods_delete" on public.store_payment_methods for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_payment_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_payment_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Store public settings.
drop policy if exists "store_public_settings_select_member" on public.store_public_settings;
drop policy if exists "store_public_settings_write_admin" on public.store_public_settings;
create policy "store_public_settings_select" on public.store_public_settings for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_public_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_public_settings.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_public_settings_insert" on public.store_public_settings for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_public_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_public_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_public_settings_update" on public.store_public_settings for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_public_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_public_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_public_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_public_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_public_settings_delete" on public.store_public_settings for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_public_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_public_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Store settings.
drop policy if exists "store_settings_select_member" on public.store_settings;
drop policy if exists "store_settings_write_admin" on public.store_settings;
create policy "store_settings_select" on public.store_settings for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_settings.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_settings_insert" on public.store_settings for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_settings_update" on public.store_settings for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_settings_delete" on public.store_settings for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_settings.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_settings.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Shipping methods.
drop policy if exists "store_shipping_methods_select_member" on public.store_shipping_methods;
drop policy if exists "store_shipping_methods_write_admin" on public.store_shipping_methods;
create policy "store_shipping_methods_select" on public.store_shipping_methods for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_shipping_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_shipping_methods.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_shipping_methods_insert" on public.store_shipping_methods for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_shipping_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_shipping_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_shipping_methods_update" on public.store_shipping_methods for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_shipping_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_shipping_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_shipping_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_shipping_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_shipping_methods_delete" on public.store_shipping_methods for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_shipping_methods.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_shipping_methods.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Tax rules.
drop policy if exists "store_tax_rules_select_member" on public.store_tax_rules;
drop policy if exists "store_tax_rules_write_admin" on public.store_tax_rules;
create policy "store_tax_rules_select" on public.store_tax_rules for select to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_tax_rules.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_tax_rules.store_id and sm.user_id=(select auth.uid()))
);
create policy "store_tax_rules_insert" on public.store_tax_rules for insert to authenticated with check (
  exists(select 1 from public.store_owners so where so.store_id=store_tax_rules.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_tax_rules.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_tax_rules_update" on public.store_tax_rules for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_tax_rules.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_tax_rules.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
) with check (
  exists(select 1 from public.store_owners so where so.store_id=store_tax_rules.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_tax_rules.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);
create policy "store_tax_rules_delete" on public.store_tax_rules for delete to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=store_tax_rules.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=store_tax_rules.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')
);

-- Reviews: customer can create/edit only while pending; seller owner/admin can moderate.
drop policy if exists "reviews_insert_customer" on public.product_reviews;
drop policy if exists "reviews_update_customer" on public.product_reviews;
drop policy if exists "reviews_moderate_member" on public.product_reviews;
create policy "reviews_insert_customer" on public.product_reviews for insert to authenticated with check (
  status = 'pending'
  and verified_purchase = false
  and exists(
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
create policy "reviews_update_customer" on public.product_reviews for update to authenticated using (
  status='pending'
  and exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()))
) with check (
  status='pending'
  and verified_purchase=false
  and exists(select 1 from public.customers c where c.id=product_reviews.customer_id and c.store_id=product_reviews.store_id and c.auth_user_id=(select auth.uid()))
);
create policy "reviews_moderate_member" on public.product_reviews for update to authenticated using (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
) with check (
  exists(select 1 from public.store_owners so where so.store_id=product_reviews.store_id and so.owner_id=(select auth.uid()))
  or exists(select 1 from public.store_members sm where sm.store_id=product_reviews.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin'))
);

-- Index every new composite/singular FK flagged by the advisor.
create index if not exists analytics_events_store_order_idx on public.analytics_events(store_id, order_id);
create index if not exists analytics_events_store_product_idx on public.analytics_events(store_id, product_id);
create index if not exists coupon_redemptions_store_order_idx on public.coupon_redemptions(store_id, order_id);
create index if not exists product_reviews_store_customer_idx on public.product_reviews(store_id, customer_id);
create index if not exists product_reviews_store_order_idx on public.product_reviews(store_id, order_id);
create index if not exists store_feature_flags_key_idx on public.store_feature_flags(key);