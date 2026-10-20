-- Color options for products.
-- A product can have several colors. Each color has a swatch, an optional photo, and its own stock per size.
-- Products without colors keep working exactly as before.

create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 40),
  hex text not null check (hex ~* '^#[0-9a-f]{6}$'),
  image_url text,
  image_alt text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_colors_product_idx on public.product_colors (product_id, sort_order);
create unique index product_colors_product_name_key
  on public.product_colors (product_id, lower(name));

-- Each stock row now belongs to a color (or to no color for products without colors).
alter table public.variants
  add column color_id uuid references public.product_colors(id) on delete restrict;

alter table public.variants drop constraint if exists variants_product_id_size_key;

create unique index variants_product_size_no_color_key
  on public.variants (product_id, size) where color_id is null;
create unique index variants_product_color_size_key
  on public.variants (product_id, color_id, size) where color_id is not null;
create index variants_color_idx on public.variants (color_id);

-- Orders remember the color name, like they remember the product name and size.
alter table public.order_items add column color_name text;

alter table public.product_colors enable row level security;

create policy "Anyone can browse colors of active products"
on public.product_colors for select to anon, authenticated
using (exists (
  select 1 from public.products
  where products.id = product_colors.product_id and products.active
));
create policy "Admins manage product colors"
on public.product_colors for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke all on public.product_colors from anon, authenticated;
grant select on public.product_colors to anon, authenticated;
grant select, insert, update, delete on public.product_colors to authenticated;

-- Orders now take an optional color_id on every item line:
-- [{"product_id":"street-high","color_id":"<uuid or null>","size":"42","quantity":1}]
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
    from jsonb_to_recordset(p_items) as item(product_id text, color_id uuid, size text, quantity integer)
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

  update public.orders
  set subtotal_etb = v_subtotal, total_etb = v_subtotal
  where id = v_order_id;

  return v_order_id;
end;
$$;
