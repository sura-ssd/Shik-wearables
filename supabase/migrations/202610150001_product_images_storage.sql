-- Public bucket for product photos. Anyone can view them; only admins can add, change or remove them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins update product images"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()))
with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admins delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and (select public.is_admin()));
