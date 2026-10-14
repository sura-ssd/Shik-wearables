# Shik wearables

Phase 1 storefront for sneakers and everyday clothing, built with React 18, Vite, TypeScript, React Router, Tailwind CSS, and Zustand.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm run dev
```

Production checks:

```sh
npm run lint
npm run build
```

## Phase 1 scope

The catalog is local JSON. Category filters, search, sorting, size selection, and a cart drawer are available. Cart contents persist in the browser's local storage. The interface follows the operating system's light or dark preference and is designed from 360px wide upward.

The displayed ETB prices are sample catalog values only. Confirm currency, delivery coverage and fees, cash-on-delivery availability, business details, and policies with the owner before checkout or launch. Payment, customer accounts, remote data, and admin tools are later roadmap phases.

## Supabase backend

The `supabase` directory contains the database migration and Chapa payment Edge Functions. It creates the catalog, size-level inventory, customer profiles, orders, and order items; enables RLS; and installs the transactional `place_order`, `mark_order_paid`, `cancel_order`, and `expire_pending_orders` operations. The migration schedules pending-order expiry every minute. Orders reserve stock for 30 minutes, and the catalog's seeded variant stock starts at zero.

1. Create a Supabase project and install the Supabase CLI.
2. Link this repository with `supabase link --project-ref <project-ref>` and apply the migration with `supabase db push`.
3. Set the Edge Function secret with `supabase secrets set CHAPA_SECRET_KEY=<your-chapa-secret>` and deploy using `supabase functions deploy initialize-chapa-payment` and `supabase functions deploy verify-chapa-payment`.
4. Promote a trusted account to admin from the Supabase SQL editor: `update public.profiles set role = 'admin' where user_id = '<auth-user-uuid>';`. Keep the service-role key and Chapa secret out of the browser.
5. Sign in to Supabase and set positive stock values for the desired rows in `public.variants` before accepting orders.

Authenticated customers place an order by calling `place_order` with `p_items` as an array of `{ "product_id", "size", "quantity" }` and `p_shipping` as an object with `full_name`, `phone`, `city`, `address`, and optional `delivery_note`. It reads price and active status from the database, reserves stock, and snapshots item details in one transaction. Any invalid or short item rejects the full order.

After placing an order, call the authenticated `/functions/v1/initialize-chapa-payment` endpoint with `{ "orderId" }`; it creates and saves a transaction reference, then returns Chapa's checkout URL. After the customer returns, call `/functions/v1/verify-chapa-payment` with `{ "orderId", "txRef" }`. Verification confirms order ownership, the saved transaction reference, Chapa status, currency, and exact ETB amount before invoking the server-only paid-order operation. The app checkout is not connected to Supabase yet and currently has no customer sign-in UI; connect authentication and these endpoints before enabling order placement.

## Product photos

The sample catalog uses remote Unsplash image URLs as temporary product imagery. Replace them with approved, optimized product photos before launch.
