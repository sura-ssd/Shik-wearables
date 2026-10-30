// Sends a Telegram message to the shop when an order is placed or cancelled.
// The database calls this function (see the notify_order function in the migrations).

import { createClient } from "npm:@supabase/supabase-js@2";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const chatIds = (Deno.env.get("TELEGRAM_CHAT_ID") ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);
const webhookSecret = Deno.env.get("NOTIFY_SECRET");
const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface OrderItem {
  product_name: string;
  color_name: string | null;
  size: string;
  quantity: number;
  line_total_etb: number;
}

interface Order {
  order_number: number;
  full_name: string;
  phone: string;
  sub_city: string | null;
  city: string;
  address: string;
  delivery_note: string;
  total_etb: number;
  order_items: OrderItem[];
}

const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const money = (amount: number) => `${new Intl.NumberFormat("en-US").format(amount)} ETB`;

function describeOrder(order: Order, kind: string): string {
  const customer = `${escapeHtml(order.full_name)} · ${escapeHtml(order.phone)}`;

  if (kind === "cancelled_by_customer") {
    return [
      `❌ <b>Order #${order.order_number} was cancelled by the customer</b>`,
      customer,
      "The items are back on sale.",
    ].join("\n");
  }

  const items = order.order_items
    .map((item) => {
      const details = [item.color_name, `size ${item.size}`].filter(Boolean).join(", ");
      return `• ${item.quantity} × ${escapeHtml(item.product_name)} (${escapeHtml(details)}) — ${money(item.line_total_etb)}`;
    })
    .join("\n");

  return [
    `🛍 <b>New order #${order.order_number}</b>`,
    customer,
    `📍 ${escapeHtml(order.sub_city ? `${order.sub_city}, ${order.city}` : order.city)}`,
    escapeHtml(order.address),
    order.delivery_note ? `📝 ${escapeHtml(order.delivery_note)}` : "",
    "",
    items,
    "",
    `💵 Cash to collect: <b>${money(order.total_etb)}</b>`,
    "Please phone the customer to confirm.",
  ]
    .filter((line, index, lines) => line !== "" || lines[index - 1] !== "")
    .join("\n");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!webhookSecret || request.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!botToken || chatIds.length === 0) {
    return new Response("Telegram is not set up (missing bot token or chat id)", { status: 500 });
  }

  let body: { kind?: string; order_id?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  let text: string;
  if (body.kind === "test") {
    text = "✅ <b>Telegram alerts are working.</b>\nYou will get a message here for every new order.";
  } else {
    if (!supabaseUrl || !serviceRoleKey || !body.order_id) {
      return new Response("Bad request", { status: 400 });
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_number, full_name, phone, sub_city, city, address, delivery_note, total_etb, order_items(product_name, color_name, size, quantity, line_total_etb)",
      )
      .eq("id", body.order_id)
      .maybeSingle();
    if (error || !data) return new Response("Order not found", { status: 404 });
    text = describeOrder(data as unknown as Order, body.kind ?? "new_order");
  }

  // The button only works with a public https address.
  const replyMarkup = siteUrl.startsWith("https://")
    ? { inline_keyboard: [[{ text: "Open orders", url: `${siteUrl}/admin/orders` }]] }
    : undefined;

  const failures: string[] = [];
  for (const chatId of chatIds) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });
    if (!response.ok) failures.push(`${chatId}: ${await response.text()}`);
  }

  return failures.length > 0
    ? new Response(`Telegram rejected a message: ${failures.join("; ")}`, { status: 502 })
    : new Response("ok");
});
