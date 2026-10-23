-- Cash on delivery (Addis Ababa only, free delivery).
-- Customers place an order on the site, the shop phones them to confirm it, delivers it, and collects the cash.
--
-- Order life cycle:
--   pending           placed by the customer, waiting for the shop to phone and confirm. Stock is held.
--   confirmed         the shop confirmed it by phone. Stock stays held.
--   out_for_delivery  handed to the rider.
--   delivered         delivered and cash collected.            (final)
--   cancelled         cancelled before it left the shop.       (final, stock goes back)
--   delivery_failed   refused, nobody home, or unreachable.    (final, stock goes back)
-- A pending order nobody confirms within 24 hours is cancelled automatically and its stock goes back.

-- 1. Online payment is gone: drop the Chapa function and columns.
drop function if exists public.mark_order_paid(uuid, text);
drop function if exists public.cancel_order(uuid);

alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'confirmed' where status = 'paid';
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled', 'delivery_failed'));

alter table public.orders
  drop column if exists chapa_tx_ref,
  drop column if exists chapa_checkout_url,
  drop column if exists paid_at;

-- 2. New order columns.
alter table public.orders
  add column order_number bigint generated always as identity (start with 1001),
  add column sub_city text,
  add column payment_method text not null default 'cash_on_delivery'
    check (payment_method = 'cash_on_delivery'),
  add column confirmed_at timestamptz,
  add column dispatched_at timestamptz,
  add column delivered_at timestamptz;

create unique index orders_order_number_key on public.orders (order_number);
create index orders_status_created_idx on public.orders (status, created_at);

-- Only unconfirmed orders expire, so confirmed ones have no deadline.
alter table public.orders alter column expires_at drop not null;
alter table public.orders alter column expires_at set default (now() + interval '24 hours');

-- 3. Stock goes back when an order that was holding it is cancelled or fails.
create or replace function public.restore_stock_after_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('pending', 'confirmed', 'out_for_delivery')
     and new.status in ('cancelled', 'delivery_failed') then
    update public.variants as variant
    set stock = variant.stock + item.quantity
    from public.order_items as item
    where item.order_id = old.id and variant.id = item.variant_id;
  end if;
  return new;
end;
$$;

-- 4. Placing an order.
create or replace function public.place_order(p_items jsonb, p_shipping jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_line record;
  v_variant_id uuid;
  v_stock integer;
  v_product_name text;
  v_color_name text;
  v_unit_price integer;
  v_subtotal integer := 0;
  v_full_name text;
  v_phone_raw text;
  v_phone text;
  v_sub_city text;
  v_address text;
  v_delivery_note text;
  v_open_orders integer;
  v_failed_orders integer;
  v_sub_cities text[] := array[
    'Addis Ketema', 'Akaky Kaliti', 'Arada', 'Bole', 'Gullele', 'Kirkos',
    'Kolfe Keranio', 'Lideta', 'Nifas Silk-Lafto', 'Yeka', 'Lemi Kura'
  ];
begin
  if v_user_id is null then
    raise exception 'Please sign in to place an order' using hint = 'user_message';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order items must be an array';
  end if;
  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Order must contain between 1 and 50 item lines';
  end if;
  if jsonb_typeof(p_shipping) is distinct from 'object' then
    raise exception 'Delivery details are required';
  end if;

  v_full_name := nullif(btrim(p_shipping ->> 'full_name'), '');
  v_phone_raw := regexp_replace(coalesce(p_shipping ->> 'phone', ''), '[\s()-]', '', 'g');
  v_sub_city := nullif(btrim(p_shipping ->> 'sub_city'), '');
  v_address := nullif(btrim(p_shipping ->> 'address'), '');
  v_delivery_note := coalesce(btrim(p_shipping ->> 'delivery_note'), '');

  if v_full_name is null or length(v_full_name) > 120
     or v_address is null or length(v_address) > 500
     or length(v_delivery_note) > 240 then
    raise exception 'Your delivery details are incomplete or too long' using hint = 'user_message';
  end if;

  if v_sub_city is null or not (v_sub_city = any (v_sub_cities)) then
    raise exception 'Please choose your sub-city in Addis Ababa' using hint = 'user_message';
  end if;

  -- Ethiopian mobile numbers only, saved in one format (+2519XXXXXXXX) so the shop can call them.
  if v_phone_raw ~ '^0[79][0-9]{8}$' then
    v_phone := '+251' || substr(v_phone_raw, 2);
  elsif v_phone_raw ~ '^\+?251[79][0-9]{8}$' then
    v_phone := '+' || ltrim(v_phone_raw, '+');
  else
    raise exception 'Enter a valid Ethiopian mobile number' using hint = 'user_message';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id text, color_id uuid, size text, quantity integer)
    where item.product_id is null or item.size is null
       or item.quantity is null or item.quantity < 1 or item.quantity > 10
  ) then
    raise exception 'Each item needs a product, size, and quantity from 1 to 10';
  end if;

  -- Protection against fake orders.
  select count(*) into v_open_orders
  from public.orders
  where user_id = v_user_id and status in ('pending', 'confirmed', 'out_for_delivery');
  if v_open_orders >= 3 then
    raise exception 'You already have 3 open orders. Please wait for them to arrive, or cancel one first.'
      using hint = 'user_message';
  end if;

  select count(*) into v_failed_orders
  from public.orders
  where user_id = v_user_id and status = 'delivery_failed' and created_at > now() - interval '90 days';
  if v_failed_orders >= 2 then
    raise exception 'We cannot take new orders from this account right now. Please contact us.'
      using hint = 'user_message';
  end if;

  insert into public.orders (
    user_id, status, full_name, phone, city, sub_city, address, delivery_note, expires_at
  ) values (
    v_user_id, 'pending', v_full_name, v_phone, 'Addis Ababa', v_sub_city, v_address, v_delivery_note,
    now() + interval '24 hours'
  ) returning id into v_order_id;

  for v_line in
    select item.product_id, item.color_id, item.size, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id text, color_id uuid, size text, quantity integer)
    group by item.product_id, item.color_id, item.size
    order by item.product_id, item.color_id, item.size
  loop
    select variant.id, variant.stock, product.name, product.price_etb, color.name
      into v_variant_id, v_stock, v_product_name, v_unit_price, v_color_name
    from public.variants as variant
    join public.products as product on product.id = variant.product_id
    left join public.product_colors as color on color.id = variant.color_id
    where variant.product_id = v_line.product_id
      and variant.color_id is not distinct from v_line.color_id
      and variant.size = v_line.size
      and product.active
    for update of variant;

    if not found then
      raise exception 'Product, color or size is unavailable: % / % / %', v_line.product_id, v_line.color_id, v_line.size;
    end if;

    if v_stock < v_line.quantity then
      raise exception 'Insufficient stock for % / % / %', v_line.product_id, v_line.color_id, v_line.size;
    end if;

    update public.variants
    set stock = stock - v_line.quantity
    where id = v_variant_id;

    insert into public.order_items (
      order_id, variant_id, product_id, product_name, color_name, size,
      quantity, unit_price_etb, line_total_etb
    ) values (
      v_order_id, v_variant_id, v_line.product_id, v_product_name, v_color_name, v_line.size,
      v_line.quantity, v_unit_price, v_unit_price * v_line.quantity
    );

    v_subtotal := v_subtotal + v_unit_price * v_line.quantity;
  end loop;

  -- Delivery is free in Addis Ababa, so the total is just the items.
  update public.orders
  set subtotal_etb = v_subtotal, delivery_fee_etb = 0, total_etb = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;

-- 5. Admin moves an order along. Only the allowed steps are accepted.
create function public.update_order_status(p_order_id uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Only admins can update orders';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = p_status then
    return;
  end if;

  if not (
    (v_order.status = 'pending' and p_status in ('confirmed', 'cancelled'))
    or (v_order.status = 'confirmed' and p_status in ('out_for_delivery', 'cancelled'))
    or (v_order.status = 'out_for_delivery' and p_status in ('delivered', 'delivery_failed'))
  ) then
    raise exception 'An order that is % cannot be changed to %', v_order.status, p_status;
  end if;

  if p_status in ('cancelled', 'delivery_failed') then
    if v_reason is null then
      raise exception 'A reason is required';
    end if;
    if length(v_reason) > 240 then
      raise exception 'The reason is too long';
    end if;
  end if;

  update public.orders
  set status = p_status,
      confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
      dispatched_at = case when p_status = 'out_for_delivery' then now() else dispatched_at end,
      delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
      cancelled_at = case when p_status in ('cancelled', 'delivery_failed') then now() else cancelled_at end,
      cancellation_reason = case when p_status in ('cancelled', 'delivery_failed') then v_reason else cancellation_reason end,
      expires_at = null
  where id = p_order_id;
end;
$$;

-- 6. A customer can cancel their own order until the shop confirms it.
create function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders
  where id = p_order_id and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.status = 'cancelled' then
    return;
  end if;
  if v_order.status <> 'pending' then
    raise exception 'This order is already confirmed. Please call us to cancel it.' using hint = 'user_message';
  end if;

  update public.orders
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'customer', expires_at = null
  where id = p_order_id;
end;
$$;

-- 7. Access. Order status can only change through the functions above.
drop policy if exists "Admins update orders" on public.orders;
revoke update on public.orders from authenticated;

revoke all on function public.update_order_status(uuid, text, text) from public, anon;
grant execute on function public.update_order_status(uuid, text, text) to authenticated;
revoke all on function public.cancel_my_order(uuid) from public, anon;
grant execute on function public.cancel_my_order(uuid) to authenticated;
