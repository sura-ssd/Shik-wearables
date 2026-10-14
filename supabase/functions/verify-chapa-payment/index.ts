import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyRequest {
  orderId?: string;
  txRef?: string;
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

  if (!authorization || !supabaseUrl || !anonKey || !serviceRoleKey || !chapaSecret) {
    return jsonResponse({ error: "Payment verification is not configured" }, 500);
  }

  let body: VerifyRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  if (!isUuid(body.orderId) || typeof body.txRef !== "string" || body.txRef.trim().length === 0) {
    return jsonResponse({ error: "A valid orderId and txRef are required" }, 400);
  }

  const token = authorization.replace(/^Bearer\s+/i, "");
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);

  if (userError || !userData.user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .select("id, user_id, status, total_etb, chapa_tx_ref, expires_at")
    .eq("id", body.orderId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (orderError) {
    return jsonResponse({ error: "Could not load order" }, 500);
  }
  if (!order) {
    return jsonResponse({ error: "Order not found" }, 404);
  }
  if (order.status === "paid" && order.chapa_tx_ref === body.txRef) {
    return jsonResponse({ orderId: order.id, status: "paid" });
  }
  if (order.chapa_tx_ref !== body.txRef) {
    return jsonResponse({ error: "Transaction reference does not belong to this order" }, 409);
  }
  if (order.status !== "pending" || Date.parse(order.expires_at) <= Date.now()) {
    return jsonResponse({ error: "Order is no longer payable" }, 409);
  }

  let chapaResponse: Response;
  try {
    chapaResponse = await fetch(
      `https://api.chapa.co/v1/transaction/verify/${encodeURIComponent(body.txRef)}`,
      { headers: { Authorization: `Bearer ${chapaSecret}` } },
    );
  } catch {
    return jsonResponse({ error: "Could not reach Chapa" }, 502);
  }

  const chapaResult = await chapaResponse.json().catch(() => null);
  const payment = chapaResult?.data;
  const verified = chapaResponse.ok
    && payment?.status?.toLowerCase() === "success"
    && payment?.currency?.toUpperCase() === "ETB"
    && payment?.tx_ref === body.txRef
    && Number(payment?.amount) === order.total_etb;

  if (!verified) {
    return jsonResponse({ error: "Chapa did not confirm this order payment" }, 402);
  }

  const { error: markPaidError } = await adminClient.rpc("mark_order_paid", {
    p_order_id: order.id,
    p_chapa_tx_ref: body.txRef,
  });

  if (markPaidError) {
    return jsonResponse({ error: "Payment was verified but the order could not be updated" }, 409);
  }

  return jsonResponse({ orderId: order.id, status: "paid" });
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