import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InitializeRequest {
  orderId?: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const chapaSecret = Deno.env.get("CHAPA_SECRET_KEY");
  const siteUrl = Deno.env.get("SITE_URL");

  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey || !chapaSecret || !siteUrl) {
    return jsonResponse({ error: "Payment initialization is not configured" }, 500);
  }

  let body: InitializeRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }
  if (!isUuid(body.orderId)) {
    return jsonResponse({ error: "A valid orderId is required" }, 400);
  }

  const token = authorization.replace(/^Bearer\s+/i, "");
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }
  if (!userData.user.email) {
    return jsonResponse({ error: "An account email is required for payment" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, status, total_etb, expires_at, chapa_tx_ref, chapa_checkout_url, full_name")
    .eq("id", body.orderId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (orderError) {
    return jsonResponse({ error: "Could not load order" }, 500);
  }
  if (!order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.status !== "pending" || Date.parse(order.expires_at) <= Date.now()) {
    return jsonResponse({ error: "Order is no longer payable" }, 409);
  }
  if (order.chapa_checkout_url && order.chapa_tx_ref) {
    return jsonResponse({ checkoutUrl: order.chapa_checkout_url, txRef: order.chapa_tx_ref });
  }

  const txRef = order.chapa_tx_ref ?? `shik-${crypto.randomUUID()}`;
  if (!order.chapa_tx_ref) {
    const { data: claimedOrder, error: claimError } = await adminClient
      .from("orders")
      .update({ chapa_tx_ref: txRef })
      .eq("id", order.id)
      .eq("status", "pending")
      .is("chapa_tx_ref", null)
      .select("id")
      .maybeSingle();

    if (claimError) {
      return jsonResponse({ error: "Could not prepare payment" }, 500);
    }
    if (!claimedOrder) {
      return jsonResponse({ error: "Payment is already being prepared; retry shortly" }, 409);
    }
  }

  const nameParts = order.full_name.trim().split(/\s+/);
  let chapaResponse: Response;
  try {
    chapaResponse = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chapaSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(order.total_etb),
        currency: "ETB",
        email: userData.user.email,
        first_name: nameParts[0],
        last_name: nameParts.slice(1).join(" ") || nameParts[0],
        tx_ref: txRef,
        return_url: `${siteUrl.replace(/\/$/, "")}/order-complete?orderId=${order.id}&txRef=${encodeURIComponent(txRef)}`,
      }),
    });
  } catch {
    return jsonResponse({ error: "Could not reach Chapa" }, 502);
  }

  const chapaResult = await chapaResponse.json().catch(() => null);
  const checkoutUrl = chapaResult?.data?.checkout_url;
  if (!chapaResponse.ok || typeof checkoutUrl !== "string") {
    return jsonResponse({ error: "Chapa could not initialize this payment" }, 502);
  }

  const { error: saveError } = await adminClient
    .from("orders")
    .update({ chapa_checkout_url: checkoutUrl })
    .eq("id", order.id)
    .eq("chapa_tx_ref", txRef);
  if (saveError) {
    return jsonResponse({ error: "Payment started but its checkout URL could not be saved" }, 500);
  }

  return jsonResponse({ checkoutUrl, txRef });
});

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function jsonResponse(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}