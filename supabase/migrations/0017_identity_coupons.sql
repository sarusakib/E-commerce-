alter table public.orders add column if not exists coupon_code text;

create type public.coupon_type as enum ('percentage', 'fixed');

create table public.coupons (id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade, code text not null, type public.coupon_type not null, value numeric(18,4) not null check (value > 0), min_subtotal numeric(18,2) not null default 0 check (min_subtotal >= 0), max_discount numeric(18,2) check (max_discount is null or max_discount >= 0), starts_at timestamptz, ends_at timestamptz, usage_limit integer check (usage_limit is null or usage_limit > 0), usage_count integer not null default 0, per_customer_limit integer not null default 1 check (per_customer_limit > 0), active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (ends_at is null or starts_at is null or ends_at > starts_at), check ((type='percentage' and value <= 100) or type='fixed'));
create unique index coupons_store_code_uq on public.coupons(store_id, lower(code));
create index coupons_store_active_idx on public.coupons(store_id, active, starts_at, ends_at);
create table public.coupon_redemptions (id uuid primary key default gen_random_uuid(), store_id uuid not null references public.stores(id) on delete cascade, coupon_id uuid not null references public.coupons(id) on delete restrict, customer_id uuid not null, order_id uuid not null, discount_amount numeric(18,2) not null check(discount_amount>=0), created_at timestamptz not null default now(), unique(coupon_id,order_id), constraint coupon_redemptions_customer_store_fk foreign key(store_id,customer_id) references public.customers(store_id,id) on delete cascade, constraint coupon_redemptions_order_store_fk foreign key(store_id,order_id) references public.orders(store_id,id) on delete cascade);
create index coupon_redemptions_customer_idx on public.coupon_redemptions(store_id, customer_id, coupon_id, created_at desc);
create index coupon_redemptions_coupon_idx on public.coupon_redemptions(coupon_id, created_at desc);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
create policy "coupons_select_member" on public.coupons for select to authenticated using (exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid())) or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid())));
create policy "coupons_write_admin" on public.coupons for all to authenticated using (exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid())) or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin')) with check (exists(select 1 from public.store_owners so where so.store_id=coupons.store_id and so.owner_id=(select auth.uid())) or exists(select 1 from public.store_members sm where sm.store_id=coupons.store_id and sm.user_id=(select auth.uid()) and sm.role='admin'));
create policy "coupon_redemptions_select" on public.coupon_redemptions for select to authenticated using (exists(select 1 from public.store_owners so where so.store_id=coupon_redemptions.store_id and so.owner_id=(select auth.uid())) or exists(select 1 from public.store_members sm where sm.store_id=coupon_redemptions.store_id and sm.user_id=(select auth.uid())) or exists(select 1 from public.customers c where c.id=coupon_redemptions.customer_id and c.store_id=coupon_redemptions.store_id and c.auth_user_id=(select auth.uid())));
grant select, insert, update, delete on public.coupons to authenticated; grant select on public.coupon_redemptions to authenticated;
create trigger coupons_set_updated_at before update on public.coupons for each row execute function private.set_updated_at();


-- E-Commerce Premium: data-driven checkout provider, shipping and tax rules.

create or replace function public.create_guest_order_base(
  p_store_slug text,
  p_idempotency_key text,
  p_customer jsonb,
  p_items jsonb,
  p_shipping_address jsonb,
  p_billing_address jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store public.stores%rowtype;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_confirmation_token text;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_phone text;
  v_country_code text;
  v_currency text;
  v_payment_provider text;
  v_shipping_code text;
  v_shipping_total numeric(18,2) := 0;
  v_tax_total numeric(18,2) := 0;
  v_tax_rate numeric(8,5) := 0;
  v_tax_inclusive boolean := false;
  v_subtotal numeric(18,2) := 0;
  v_item jsonb;
  v_resolved_items jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_quantity integer;
  v_unit_price numeric(18,2);
  v_sku text;
  v_stock integer;
begin
  if length(coalesce(p_store_slug, '')) < 2 or length(p_store_slug) > 63 then
    raise exception 'Invalid store';
  end if;

  if length(coalesce(p_idempotency_key, '')) < 16 or length(p_idempotency_key) > 120 then
    raise exception 'Invalid checkout idempotency key';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Checkout must contain between 1 and 50 items';
  end if;

  v_email := lower(trim(coalesce(p_customer->>'email', '')));
  v_first_name := trim(coalesce(p_customer->>'first_name', ''));
  v_last_name := trim(coalesce(p_customer->>'last_name', ''));
  v_phone := trim(coalesce(p_customer->>'phone', ''));
  v_country_code := upper(trim(coalesce(p_shipping_address->>'country_code', '')));

  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email) > 254 then
    raise exception 'Invalid customer email';
  end if;

  if length(v_first_name) > 80 or length(v_last_name) > 80 or length(v_phone) > 40 then
    raise exception 'Customer information is too long';
  end if;

  if v_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid shipping country';
  end if;

  select * into v_store
  from public.stores
  where slug = lower(trim(p_store_slug))
    and status = 'active';

  if not found then
    raise exception 'Store is not available';
  end if;

  v_currency := v_store.default_currency;

  select provider into v_payment_provider
  from public.store_payment_methods
  where store_id = v_store.id
    and code = 'cod'
    and enabled = true
  order by sort_order, created_at
  limit 1;

  if v_payment_provider is null then
    raise exception 'Cash on delivery is not enabled for this store';
  end if;

  select code, price into v_shipping_code, v_shipping_total
  from public.store_shipping_methods
  where store_id = v_store.id
    and enabled = true
    and (currency = v_currency)
    and (
      jsonb_array_length(countries) = 0
      or countries @> jsonb_build_array(v_country_code)
    )
  order by sort_order, created_at
  limit 1;

  v_shipping_code := coalesce(v_shipping_code, 'none');
  v_shipping_total := coalesce(v_shipping_total, 0);

  -- Idempotency: returning the original order prevents duplicate checkout submissions.
  select id, order_number, confirmation_token, currency, grand_total
    into v_order_id, v_order_number, v_confirmation_token, v_currency, v_subtotal
  from public.orders
  where store_id = v_store.id
    and checkout_id = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'order_id', v_order_id,
      'order_number', v_order_number,
      'confirmation_token', v_confirmation_token,
      'currency', v_currency,
      'grand_total', v_subtotal
    );
  end if;

  insert into public.customers (store_id, email, first_name, last_name, phone)
  values (v_store.id, v_email, v_first_name, v_last_name, v_phone)
  on conflict do nothing;

  select id into v_customer_id
  from public.customers
  where store_id = v_store.id and lower(email) = v_email
  limit 1;

  update public.customers
  set first_name = v_first_name,
      last_name = v_last_name,
      phone = v_phone
  where id = v_customer_id;

  -- Save the latest shipping address for the customer's future account history.
  update public.customer_addresses
  set is_default = false
  where store_id = v_store.id
    and customer_id = v_customer_id
    and is_default = true;

  insert into public.customer_addresses (
    store_id, customer_id, label, recipient_name, phone, country_code,
    state, city, line1, line2, postal_code, is_default
  ) values (
    v_store.id,
    v_customer_id,
    'Shipping',
    trim(concat_ws(' ', v_first_name, v_last_name)),
    v_phone,
    v_country_code,
    trim(coalesce(p_shipping_address->>'state', '')),
    trim(coalesce(p_shipping_address->>'city', '')),
    trim(coalesce(p_shipping_address->>'line1', '')),
    trim(coalesce(p_shipping_address->>'line2', '')),
    trim(coalesce(p_shipping_address->>'postal_code', '')),
    true
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_quantity is null or v_quantity < 1 or v_quantity > 1000 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product
    from public.products
    where id = v_product_id
      and store_id = v_store.id
      and status = 'active'
    for update;

    if not found then
      raise exception 'A product is no longer available';
    end if;

    if v_product.currency <> v_currency then
      raise exception 'Product currency does not match store currency';
    end if;

    v_unit_price := v_product.price;
    v_sku := v_product.sku;
    v_stock := v_product.stock;

    if v_variant_id is not null then
      select * into v_variant
      from public.product_variants
      where id = v_variant_id
        and store_id = v_store.id
        and product_id = v_product.id
      for update;

      if not found then
        raise exception 'A selected product variant is no longer available';
      end if;

      v_unit_price := v_variant.price;
      v_sku := coalesce(v_variant.sku, v_sku);
      v_stock := v_variant.stock;
    end if;

    if v_stock < v_quantity then
      raise exception 'Insufficient stock for a selected product';
    end if;

    if v_variant_id is not null then
      update public.product_variants
      set stock = stock - v_quantity
      where id = v_variant_id;
    else
      update public.products
      set stock = stock - v_quantity
      where id = v_product.id;
    end if;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
    v_resolved_items := v_resolved_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant_id,
      'product_name', v_product.name,
      'sku', v_sku,
      'quantity', v_quantity,
      'unit_price', v_unit_price,
      'line_total', (v_unit_price * v_quantity)
    ));
  end loop;

  v_order_number := 'EP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_confirmation_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  select rate, tax_inclusive into v_tax_rate, v_tax_inclusive
  from public.store_tax_rules
  where store_id = v_store.id
    and country_code = v_country_code
    and enabled = true
  limit 1;

  v_tax_rate := coalesce(v_tax_rate, 0);
  if v_tax_rate > 0 then
    if v_tax_inclusive then
      v_tax_total := round(v_subtotal - (v_subtotal / (1 + (v_tax_rate / 100))), 2);
    else
      v_tax_total := round(v_subtotal * (v_tax_rate / 100), 2);
    end if;
  end if;

  insert into public.orders (
    store_id, customer_id, order_number, checkout_id, confirmation_token,
    status, payment_status, currency, subtotal, discount_total, tax_total,
    shipping_total, grand_total, customer_email, customer_phone,
    shipping_address, billing_address, notes, payment_provider
  ) values (
    v_store.id,
    v_customer_id,
    v_order_number,
    p_idempotency_key,
    v_confirmation_token,
    'confirmed',
    'unpaid',
    v_currency,
    v_subtotal,
    0,
    v_tax_total,
    v_shipping_total,
    v_subtotal + v_shipping_total +
      case when v_tax_inclusive then 0 else v_tax_total end,
    v_email,
    v_phone,
    p_shipping_address,
    p_billing_address,
    '',
    v_payment_provider
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(v_resolved_items)
  loop
    insert into public.order_items (
      store_id, order_id, product_id, variant_id, product_name, sku,
      quantity, unit_price, discount_total, tax_total, line_total
    ) values (
      v_store.id,
      v_order_id,
      (v_item->>'product_id')::uuid,
      nullif(v_item->>'variant_id', '')::uuid,
      v_item->>'product_name',
      nullif(v_item->>'sku', ''),
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      0,
      0,
      (v_item->>'line_total')::numeric
    );
  end loop;

  insert into public.order_events (store_id, order_id, event_type, payload)
  values (
    v_store.id,
    v_order_id,
    'order.created',
    jsonb_build_object(
      'payment_provider', v_payment_provider,
      'shipping_method', v_shipping_code,
      'tax_rate', v_tax_rate,
      'tax_inclusive', v_tax_inclusive,
      'source', 'guest_checkout',
      'item_count', jsonb_array_length(v_resolved_items)
    )
  );

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'confirmation_token', v_confirmation_token,
    'currency', v_currency,
    'grand_total', v_subtotal
  );
end;
$$;

revoke all on function public.create_guest_order(text, text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_guest_order(text, text, jsonb, jsonb, jsonb, jsonb) to service_role;

revoke execute on function public.create_guest_order_base(text, text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_guest_order(text, text, jsonb, jsonb, jsonb, jsonb) to service_role;




revoke execute on function public.create_guest_order_base(text,text,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_guest_order_base(text,text,jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function public.create_guest_order(p_store_slug text,p_idempotency_key text,p_customer jsonb,p_items jsonb,p_shipping_address jsonb,p_billing_address jsonb default '{}'::jsonb,p_coupon_code text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_result jsonb; v_order public.orders%rowtype; v_coupon public.coupons%rowtype; v_customer_id uuid; v_code text := nullif(upper(trim(coalesce(p_coupon_code,''))), ''); v_discount numeric(18,2):=0; v_new_total numeric(18,2); v_customer_uses integer:=0;
begin
  v_result := public.create_guest_order_base(p_store_slug,p_idempotency_key,p_customer,p_items,p_shipping_address,p_billing_address);
  if v_code is null then return v_result || jsonb_build_object('discount_total',0,'coupon_code',null); end if;
  select * into v_order from public.orders where id=(v_result->>'order_id')::uuid for update; v_customer_id:=v_order.customer_id;
  select * into v_coupon from public.coupons where store_id=v_order.store_id and upper(code)=v_code and active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()) for update;
  if not found then raise exception 'Coupon is not available'; end if;
  if v_coupon.usage_limit is not null and v_coupon.usage_count>=v_coupon.usage_limit then raise exception 'Coupon usage limit has been reached'; end if;
  if v_order.subtotal<v_coupon.min_subtotal then raise exception 'Order subtotal is below the coupon minimum'; end if;
  select count(*) into v_customer_uses from public.coupon_redemptions where coupon_id=v_coupon.id and customer_id=v_customer_id;
  if v_customer_uses>=v_coupon.per_customer_limit then raise exception 'Coupon has already been used for this customer'; end if;
  if v_coupon.type='percentage' then v_discount:=round(v_order.subtotal*(v_coupon.value/100),2); else v_discount:=round(v_coupon.value,2); end if;
  if v_coupon.max_discount is not null then v_discount:=least(v_discount,v_coupon.max_discount); end if; v_discount:=least(v_discount,v_order.subtotal);
  v_new_total:=round(v_order.grand_total-v_discount,2);
  update public.orders set discount_total=v_discount,grand_total=v_new_total,coupon_code=v_coupon.code where id=v_order.id;
  update public.coupons set usage_count=usage_count+1 where id=v_coupon.id;
  insert into public.coupon_redemptions(store_id,coupon_id,customer_id,order_id,discount_amount) values(v_order.store_id,v_coupon.id,v_customer_id,v_order.id,v_discount);
  insert into public.order_events(store_id,order_id,event_type,payload) values(v_order.store_id,v_order.id,'coupon.applied',jsonb_build_object('coupon_code',v_coupon.code,'discount_total',v_discount));
  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'confirmation_token',v_order.confirmation_token,'currency',v_order.currency,'grand_total',v_new_total,'discount_total',v_discount,'coupon_code',v_coupon.code);
end; $$;
revoke all on function public.create_guest_order(text,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.create_guest_order(text,text,jsonb,jsonb,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_guest_order(text,text,jsonb,jsonb,jsonb,jsonb,text) to service_role;