-- E-Commerce Premium: transaction-safe guest checkout foundation.

alter table public.orders
  add column if not exists checkout_id text,
  add column if not exists confirmation_token text;

create unique index if not exists orders_store_checkout_uq
  on public.orders(store_id, checkout_id)
  where checkout_id is not null;
create unique index if not exists orders_confirmation_token_uq
  on public.orders(confirmation_token)
  where confirmation_token is not null;

create or replace function public.create_guest_order(
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
    0,
    0,
    v_subtotal,
    v_email,
    v_phone,
    p_shipping_address,
    p_billing_address,
    '',
    'cod'
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
      'payment_provider', 'cod',
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

create or replace function public.get_guest_order(p_confirmation_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_store_name text;
  v_items jsonb;
begin
  if length(coalesce(p_confirmation_token, '')) < 48 or length(p_confirmation_token) > 80 then
    raise exception 'Invalid confirmation token';
  end if;

  select o.* into v_order
  from public.orders o
  where o.confirmation_token = p_confirmation_token;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select s.name into v_store_name
  from public.stores s
  where s.id = v_order.store_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'sku', oi.sku,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'line_total', oi.line_total
  ) order by oi.created_at), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'found', true,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'currency', v_order.currency,
    'grand_total', v_order.grand_total,
    'customer_email', v_order.customer_email,
    'store_name', v_store_name,
    'created_at', v_order.created_at,
    'tracking_number', v_order.tracking_number,
    'items', v_items
  );
end;
$$;

revoke all on function public.get_guest_order(text) from public;
grant execute on function public.get_guest_order(text) to service_role;