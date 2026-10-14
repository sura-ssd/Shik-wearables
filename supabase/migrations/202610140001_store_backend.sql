create extension if not exists pg_cron with schema pg_catalog;

create table public.products (
  id text primary key,
  name text not null,
  category text not null check (category in ('Sneakers', 'Tops', 'Bottoms')),
  price_etb integer not null check (price_etb >= 0),
  image_url text not null,
  image_alt text not null default '',
  badge text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete restrict,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  full_name text not null,
  phone text not null,
  city text not null,
  address text not null,
  delivery_note text not null default '',
  subtotal_etb integer not null default 0 check (subtotal_etb >= 0),
  delivery_fee_etb integer not null default 0 check (delivery_fee_etb >= 0),
  total_etb integer not null default 0 check (total_etb >= 0),
  chapa_tx_ref text unique,
  chapa_checkout_url text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  variant_id uuid not null references public.variants(id) on delete restrict,
  product_id text not null references public.products(id) on delete restrict,
  product_name text not null,
  size text not null,
  quantity integer not null check (quantity > 0),
  unit_price_etb integer not null check (unit_price_etb >= 0),
  line_total_etb integer not null check (line_total_etb >= 0),
  created_at timestamptz not null default now()
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_pending_expiry_idx on public.orders (expires_at) where status = 'pending';
create index order_items_order_idx on public.order_items (order_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger variants_set_updated_at before update on public.variants
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create function public.restore_stock_after_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'cancelled' then
    update public.variants as variant
    set stock = variant.stock + item.quantity
    from public.order_items as item
    where item.order_id = old.id and variant.id = item.variant_id;
  end if;
  return new;
end;
$$;

create trigger orders_restore_stock_after_cancellation
after update of status on public.orders
for each row execute function public.restore_stock_after_cancellation();

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create function public.place_order(p_items jsonb, p_shipping jsonb)
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
  v_unit_price integer;
  v_subtotal integer := 0;
  v_full_name text;
  v_phone text;
  v_city text;
  v_address text;
  v_delivery_note text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to place an order';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Order items must be an array';
  end if;

  if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Order must contain between 1 and 50 item lines';
  end if;

  if jsonb_typeof(p_shipping) <> 'object' then
    raise exception 'Shipping details are required';
  end if;

  v_full_name := nullif(btrim(p_shipping ->> 'full_name'), '');
  v_phone := nullif(btrim(p_shipping ->> 'phone'), '');
  v_city := nullif(btrim(p_shipping ->> 'city'), '');
  v_address := nullif(btrim(p_shipping ->> 'address'), '');
  v_delivery_note := coalesce(btrim(p_shipping ->> 'delivery_note'), '');

  if v_full_name is null or length(v_full_name) > 120
     or v_phone is null or length(v_phone) > 40
     or v_city is null or length(v_city) > 120
     or v_address is null or length(v_address) > 500
     or length(v_delivery_note) > 240 then
    raise exception 'Shipping details are incomplete or too long';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id text, size text, quantity integer)
    where item.product_id is null or item.size is null
       or item.quantity is null or item.quantity < 1 or item.quantity > 100
  ) then
    raise exception 'Each item needs a product, size, and quantity from 1 to 100';
  end if;

  insert into public.orders (
    user_id, full_name, phone, city, address, delivery_note
  ) values (
    v_user_id, v_full_name, v_phone, v_city, v_address, v_delivery_note
  ) returning id into v_order_id;

  for v_line in
    select item.product_id, item.size, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id text, size text, quantity integer)
    group by item.product_id, item.size
    order by item.product_id, item.size
  loop
    select variant.id, variant.stock, product.name, product.price_etb
      into v_variant_id, v_stock, v_product_name, v_unit_price
    from public.variants as variant
    join public.products as product on product.id = variant.product_id
    where variant.product_id = v_line.product_id
      and variant.size = v_line.size
      and product.active
    for update of variant;

    if not found then
      raise exception 'Product or size is unavailable: % / %', v_line.product_id, v_line.size;
    end if;

    if v_stock < v_line.quantity then
      raise exception 'Insufficient stock for % / %', v_line.product_id, v_line.size;
    end if;

    update public.variants
    set stock = stock - v_line.quantity
    where id = v_variant_id;

    insert into public.order_items (
      order_id, variant_id, product_id, product_name, size,
      quantity, unit_price_etb, line_total_etb
    ) values (
      v_order_id, v_variant_id, v_line.product_id, v_product_name, v_line.size,
      v_line.quantity, v_unit_price, v_unit_price * v_line.quantity
    );

    v_subtotal := v_subtotal + v_unit_price * v_line.quantity;
  end loop;

  update public.orders
  set subtotal_etb = v_subtotal, total_etb = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;

create function public.mark_order_paid(p_order_id uuid, p_chapa_tx_ref text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_chapa_tx_ref is null or btrim(p_chapa_tx_ref) = '' then
    raise exception 'A Chapa transaction reference is required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'paid' then
    if v_order.chapa_tx_ref = p_chapa_tx_ref then
      return;
    end if;
    raise exception 'Order was already paid with a different transaction';
  end if;

  if v_order.chapa_tx_ref is distinct from p_chapa_tx_ref then
    raise exception 'Transaction reference does not belong to this order';
  end if;

  if v_order.status <> 'pending' or v_order.expires_at <= now() then
    raise exception 'Order is no longer payable';
  end if;

  update public.orders
  set status = 'paid', chapa_tx_ref = p_chapa_tx_ref, paid_at = now()
  where id = p_order_id;
end;
$$;

create function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only admins can cancel orders';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'cancelled' then
    return;
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Only pending orders can be cancelled';
  end if;

  update public.orders
  set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'admin'
  where id = p_order_id;
end;
$$;

create function public.expire_pending_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_expired_count integer := 0;
begin
  for v_order in
    select id
    from public.orders
    where status = 'pending' and expires_at <= now()
    order by expires_at
    for update skip locked
  loop
    update public.orders
    set status = 'cancelled', cancelled_at = now(), cancellation_reason = 'expired'
    where id = v_order.id;

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Anyone can browse active products"
on public.products for select to anon, authenticated
using (active or (select public.is_admin()));
create policy "Admins manage products"
on public.products for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Anyone can browse active variants"
on public.variants for select to anon, authenticated
using (exists (
  select 1 from public.products
  where products.id = variants.product_id and products.active
));
create policy "Admins manage variants"
on public.variants for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Customers and admins read profiles"
on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update profiles"
on public.profiles for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Customers and admins read orders"
on public.orders for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Admins update orders"
on public.orders for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "Customers and admins read order items"
on public.order_items for select to authenticated
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = (select auth.uid()) or (select public.is_admin()))
  )
);

revoke all on public.products, public.variants, public.profiles,
  public.orders, public.order_items from anon, authenticated;
grant select on public.products, public.variants to anon, authenticated;
grant select, insert, update, delete on public.products, public.variants to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.restore_stock_after_cancellation() from public, anon, authenticated;
revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.place_order(jsonb, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;
revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(uuid, text) to service_role;
revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;
revoke all on function public.expire_pending_orders() from public, anon, authenticated;
grant execute on function public.expire_pending_orders() to service_role;

select cron.schedule(
  'expire-pending-shik-orders',
  '* * * * *',
  'select public.expire_pending_orders();'
);
