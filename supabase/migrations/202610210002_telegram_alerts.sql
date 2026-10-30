-- Telegram alerts for the shop owner.
--
-- When a customer places or cancels an order, the database asks the "notify-order" function to send a
-- Telegram message. If alerts are not set up, or Telegram is down, orders still work normally.
--
-- After applying this file, finish the setup as described in README.md ("Telegram order alerts").

create extension if not exists pg_net;

-- Private settings (the function address and a shared secret). Nobody on the website can read this table.
create table public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create function public.notify_order(p_order_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.app_settings where key = 'notify_function_url';
  select value into v_secret from public.app_settings where key = 'notify_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('kind', p_kind, 'order_id', p_order_id)
  );
exception when others then
  -- A problem with alerts must never stop an order.
  null;
end;
$$;

revoke all on function public.notify_order(uuid, text) from public, anon, authenticated;

-- Run "select public.send_test_notification();" in the SQL editor to check the setup.
create function public.send_test_notification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.app_settings where key = 'notify_function_url';
  select value into v_secret from public.app_settings where key = 'notify_secret';
  if v_url is null or v_secret is null then
    raise exception 'Add notify_function_url and notify_secret to public.app_settings first';
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('kind', 'test')
  );
end;
$$;

revoke all on function public.send_test_notification() from public, anon, authenticated;

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

  -- Tell the shop on Telegram (does nothing if alerts are not set up).
  perform public.notify_order(v_order_id, 'new_order');

  return v_order_id;
end;
$$;

create or replace function public.cancel_my_order(p_order_id uuid)
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

  perform public.notify_order(p_order_id, 'cancelled_by_customer');
end;
$$;
