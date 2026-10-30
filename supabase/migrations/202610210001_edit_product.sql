-- Editing a product that is already posted.
--
-- The admin page sends the complete new state of the product (details, colors, photos, sizes and stock)
-- and this function applies it all in one step. If anything is wrong, nothing is changed.
--
-- Stock numbers are only overwritten when the admin changed them (stock = null means "leave it as it is"),
-- so a customer ordering while the admin edits does not get their reservation wiped out.
--
-- Colors and sizes that customers have already ordered cannot be removed, because past orders point to them.
-- Set their stock to 0 instead.

create function public.update_product(p_product_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_price integer;
  v_badge text;
  v_image_url text;
  v_active boolean;
  v_color jsonb;
  v_index integer;
  v_hex text;
  v_color_name text;
  v_urls text[];
  v_color_id uuid;
  v_keep uuid[];
  v_map jsonb := '{}'::jsonb;
  v_variant record;
begin
  if not public.is_admin() then
    raise exception 'Only admins can edit products';
  end if;

  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  if jsonb_typeof(p_data -> 'colors') is distinct from 'array'
     or jsonb_typeof(p_data -> 'variants') is distinct from 'array' then
    raise exception 'The product data is not valid';
  end if;
  if jsonb_array_length(p_data -> 'colors') > 20 or jsonb_array_length(p_data -> 'variants') > 400 then
    raise exception 'Too many colors or sizes' using hint = 'user_message';
  end if;

  v_name := nullif(btrim(coalesce(p_data ->> 'name', '')), '');
  v_badge := nullif(btrim(coalesce(p_data ->> 'badge', '')), '');
  v_image_url := nullif(btrim(coalesce(p_data ->> 'image_url', '')), '');
  v_active := coalesce((p_data ->> 'active')::boolean, true);

  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Enter the product name' using hint = 'user_message';
  end if;
  if p_data ->> 'category' is null or p_data ->> 'category' not in ('Sneakers', 'Tops', 'Bottoms') then
    raise exception 'Choose a category' using hint = 'user_message';
  end if;
  if coalesce(p_data ->> 'price_etb', '') !~ '^[0-9]{1,9}$' or (p_data ->> 'price_etb')::integer < 1 then
    raise exception 'Enter the price in whole birr' using hint = 'user_message';
  end if;
  v_price := (p_data ->> 'price_etb')::integer;
  if v_badge is not null and length(v_badge) > 40 then
    raise exception 'The badge is too long' using hint = 'user_message';
  end if;
  if v_image_url is null then
    raise exception 'The product needs a main photo' using hint = 'user_message';
  end if;

  select coalesce(array_agg((color.value ->> 'id')::uuid), '{}')
    into v_keep
  from jsonb_array_elements(p_data -> 'colors') as color(value)
  where color.value ->> 'id' is not null;

  if exists (
    select 1 from unnest(v_keep) as kept(id)
    where not exists (
      select 1 from public.product_colors where id = kept.id and product_id = p_product_id
    )
  ) then
    raise exception 'A color does not belong to this product';
  end if;

  begin
    update public.products
    set name = v_name,
        category = p_data ->> 'category',
        price_etb = v_price,
        badge = v_badge,
        image_url = v_image_url,
        image_alt = coalesce(btrim(p_data ->> 'image_alt'), ''),
        active = v_active
    where id = p_product_id;

    -- Remove colors that are no longer in the list (and their stock rows).
    delete from public.variants
    where product_id = p_product_id and color_id is not null and color_id <> all (v_keep);
    delete from public.product_colors
    where product_id = p_product_id and id <> all (v_keep);

    -- Update existing colors and add new ones.
    for v_color, v_index in
      select color.value, (color.ordinality - 1)::integer
      from jsonb_array_elements(p_data -> 'colors') with ordinality as color(value, ordinality)
    loop
      v_color_name := nullif(btrim(coalesce(v_color ->> 'name', '')), '');
      v_hex := lower(coalesce(v_color ->> 'hex', ''));
      v_urls := coalesce(array(select jsonb_array_elements_text(coalesce(v_color -> 'image_urls', '[]'::jsonb))), '{}');

      if v_color_name is null or length(v_color_name) > 40 then
        raise exception 'Every color needs a name' using hint = 'user_message';
      end if;
      if v_hex !~ '^#[0-9a-f]{6}$' then
        raise exception 'Pick a valid swatch color' using hint = 'user_message';
      end if;
      if cardinality(v_urls) > 6 then
        raise exception 'A color can have at most 6 photos' using hint = 'user_message';
      end if;
      if nullif(v_color ->> 'key', '') is null then
        raise exception 'The product data is not valid';
      end if;

      if v_color ->> 'id' is not null then
        v_color_id := (v_color ->> 'id')::uuid;
        update public.product_colors
        set name = v_color_name,
            hex = v_hex,
            image_url = v_urls[1],
            image_urls = v_urls,
            image_alt = coalesce(btrim(v_color ->> 'image_alt'), ''),
            sort_order = v_index
        where id = v_color_id and product_id = p_product_id;
      else
        insert into public.product_colors (product_id, name, hex, image_url, image_urls, image_alt, sort_order)
        values (p_product_id, v_color_name, v_hex, v_urls[1], v_urls, coalesce(btrim(v_color ->> 'image_alt'), ''), v_index)
        returning id into v_color_id;
      end if;

      v_map := v_map || jsonb_build_object(v_color ->> 'key', v_color_id);
    end loop;

    -- Update stock, and add the sizes that are new.
    for v_variant in
      select variant.color_key,
             case when variant.color_key is null then null else (v_map ->> variant.color_key)::uuid end as color_id,
             btrim(coalesce(variant.size, '')) as size,
             variant.stock
      from jsonb_to_recordset(p_data -> 'variants') as variant(color_key text, size text, stock integer)
    loop
      if v_variant.size = '' or length(v_variant.size) > 20 then
        raise exception 'Every size needs a name' using hint = 'user_message';
      end if;
      if v_variant.color_key is not null and v_variant.color_id is null then
        raise exception 'The product data is not valid';
      end if;
      if v_variant.stock is not null and v_variant.stock < 0 then
        raise exception 'Stock cannot be negative' using hint = 'user_message';
      end if;

      update public.variants
      set stock = coalesce(v_variant.stock, stock)
      where product_id = p_product_id
        and color_id is not distinct from v_variant.color_id
        and size = v_variant.size;

      if not found then
        insert into public.variants (product_id, color_id, size, stock)
        values (p_product_id, v_variant.color_id, v_variant.size, coalesce(v_variant.stock, 0));
      end if;
    end loop;

    -- Remove sizes that are no longer in the list.
    delete from public.variants as stale
    where stale.product_id = p_product_id
      and not exists (
        select 1
        from jsonb_to_recordset(p_data -> 'variants') as variant(color_key text, size text, stock integer)
        where btrim(coalesce(variant.size, '')) = stale.size
          and (case when variant.color_key is null then null else (v_map ->> variant.color_key)::uuid end)
              is not distinct from stale.color_id
      );
  exception
    when foreign_key_violation then
      raise exception 'Colors and sizes that customers have already ordered cannot be removed. Set their stock to 0 instead.'
        using hint = 'user_message';
    when unique_violation then
      raise exception 'Two colors, or two sizes, have the same name.' using hint = 'user_message';
  end;
end;
$$;

revoke all on function public.update_product(text, jsonb) from public, anon;
grant execute on function public.update_product(text, jsonb) to authenticated;
