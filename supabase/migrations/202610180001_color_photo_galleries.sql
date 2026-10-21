-- A color can now have several photos (up to 6). The first one is the cover photo.
alter table public.product_colors
  add column image_urls text[] not null default '{}',
  add constraint product_colors_image_urls_max check (cardinality(image_urls) <= 6);

-- Colors that already have one photo keep it as the first photo of their gallery.
update public.product_colors
set image_urls = array[image_url]
where image_url is not null and cardinality(image_urls) = 0;
