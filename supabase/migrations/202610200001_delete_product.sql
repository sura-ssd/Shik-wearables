-- Lets an admin delete a product.
--
-- A product that was never ordered is deleted completely (with its colors and stock).
-- A product that customers have already ordered cannot be erased, because past orders must keep
-- showing what was bought. It is archived instead: removed from the shop and from the admin list,
-- but kept in the order history.

alter table public.products add column archived_at timestamptz;

create function public.delete_product(p_product_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete products';
  end if;

  perform 1 from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found';
  end if;

  if exists (select 1 from public.order_items where product_id = p_product_id) then
    update public.products
    set active = false, archived_at = now()
    where id = p_product_id;
    return 'archived';
  end if;

  delete from public.variants where product_id = p_product_id;
  delete from public.product_colors where product_id = p_product_id;
  delete from public.products where id = p_product_id;
  return 'deleted';
end;
$$;

revoke all on function public.delete_product(text) from public, anon;
grant execute on function public.delete_product(text) to authenticated;
