create index if not exists ab_experiments_created_by_idx on public.ab_experiments(created_by);
create index if not exists automation_jobs_store_idx on public.automation_jobs(store_id);
create index if not exists loyalty_accounts_customer_idx on public.loyalty_accounts(customer_id);
create index if not exists loyalty_ledger_order_idx on public.loyalty_ledger(order_id);
create index if not exists loyalty_ledger_store_idx on public.loyalty_ledger(store_id);
create index if not exists marketing_campaigns_created_by_idx on public.marketing_campaigns(created_by);
create index if not exists product_models_created_by_idx on public.product_models(created_by);
create index if not exists product_models_product_idx on public.product_models(product_id);
create index if not exists risk_events_customer_idx on public.risk_events(customer_id);
create index if not exists risk_events_order_idx on public.risk_events(order_id);
create index if not exists api_keys_created_by_idx on public.api_keys(created_by);
create index if not exists webhook_endpoints_created_by_idx on public.webhook_endpoints(created_by);
create index if not exists webhook_deliveries_endpoint_idx on public.webhook_deliveries(endpoint_id);

drop policy if exists product_models_public_ready on public.product_models;
drop policy if exists product_models_seller_select on public.product_models;
drop policy if exists product_models_seller_write on public.product_models;
create policy product_models_select on public.product_models for select to anon, authenticated using (
  (status='ready' and exists (
    select 1 from public.stores s join public.products p on p.store_id=s.id
    where s.id=product_models.store_id and p.id=product_models.product_id and s.status='active' and p.status='active'
  ))
  or exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()))
);
create policy product_models_insert on public.product_models for insert to authenticated with check (
  created_by=(select auth.uid()) and (
    exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
    or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  )
);
create policy product_models_update on public.product_models for update to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
) with check (
  exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);
create policy product_models_delete on public.product_models for delete to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=product_models.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=product_models.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
);

drop policy if exists support_tickets_requester_update on public.support_tickets;
create policy support_tickets_staff_update on public.support_tickets for update to authenticated using (
  exists (select 1 from public.store_owners so where so.store_id=support_tickets.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=support_tickets.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.platform_role in ('admin','support'))
) with check (
  exists (select 1 from public.store_owners so where so.store_id=support_tickets.store_id and so.owner_id=(select auth.uid()))
  or exists (select 1 from public.store_members sm where sm.store_id=support_tickets.store_id and sm.user_id=(select auth.uid()) and sm.role in ('owner','admin','manager'))
  or exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.platform_role in ('admin','support'))
);
