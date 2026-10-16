-- One saved cart per signed-in customer. It stores only product, size and quantity.
-- Prices and stock are always read from the live catalog, and nothing is reserved here:
-- stock is only held for 30 minutes once an order is placed (place_order).
create table public.saved_carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 50),
  updated_at timestamptz not null default now()
);

create trigger saved_carts_set_updated_at before update on public.saved_carts
for each row execute function public.set_updated_at();

alter table public.saved_carts enable row level security;

create policy "Customers read their own cart"
on public.saved_carts for select to authenticated
using (user_id = (select auth.uid()));

create policy "Customers create their own cart"
on public.saved_carts for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Customers update their own cart"
on public.saved_carts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Customers delete their own cart"
on public.saved_carts for delete to authenticated
using (user_id = (select auth.uid()));

revoke all on public.saved_carts from anon, authenticated;
grant select, insert, update, delete on public.saved_carts to authenticated;

-- Forget carts nobody has touched for 30 days.
select cron.schedule(
  'delete-old-saved-carts',
  '17 3 * * *',
  $$delete from public.saved_carts where updated_at < now() - interval '30 days'$$
);
