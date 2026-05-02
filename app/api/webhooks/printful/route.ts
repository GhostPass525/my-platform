import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

let _adminClient: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}

/**
 * POST /api/webhooks/printful
 *
 * Handles Printful webhook events for the master account.
 * Register this URL in Printful dashboard → Settings → Webhooks.
 *
 * Supported events:
 *   - package_shipped   → update order with tracking info, fulfillment_status = 'shipped'
 *   - order_failed      → update order fulfillment_status = 'failed'
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as string | undefined;
  const data = body.data as Record<string, unknown> | undefined;

  console.log("[webhook/printful] event received:", type);

  try {
    if (type === "package_shipped") {
      await handlePackageShipped(data ?? {});
    } else if (type === "order_failed") {
      await handleOrderFailed(data ?? {});
    } else {
      console.log("[webhook/printful] unhandled event type:", type);
    }
  } catch (err: unknown) {
    console.error("[webhook/printful] error processing event:", type, (err as Error).message);
  }

  // Always return 200 so Printful stops retrying
  return NextResponse.json({ received: true });
}

// ── Event handlers ──────────────────────────────────────────────────────────

async function handlePackageShipped(data: Record<string, unknown>) {
  const order = data.order as Record<string, unknown> | undefined;
  if (!order) return;

  // Printful external_id format: volcity_order_${stripeSessionId}
  const externalId = order.external_id as string | undefined;
  const printfulOrderId = String(order.id ?? "");

  const shipment = (data.shipment as Record<string, unknown>) ?? {};
  const trackingNumber = (shipment.tracking_number as string) || null;
  const trackingUrl = (shipment.tracking_url as string) || null;

  if (!externalId?.startsWith("volcity_order_")) {
    console.warn("[webhook/printful] package_shipped: unrecognised external_id:", externalId);
    return;
  }

  const stripeSessionId = externalId.replace("volcity_order_", "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error } = await db
    .from("orders")
    .update({
      fulfillment_status: "shipped",
      tracking_number: trackingNumber,
      tracking_url: trackingUrl,
      shipped_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", stripeSessionId);

  if (error) {
    console.error("[webhook/printful] failed to update order on ship:", error, { stripeSessionId, printfulOrderId });
  } else {
    console.log("[webhook/printful] order marked shipped:", stripeSessionId, "tracking:", trackingNumber);
  }

  // TODO: send customer shipping notification email (Part 8 / email service)
}

async function handleOrderFailed(data: Record<string, unknown>) {
  const order = data.order as Record<string, unknown> | undefined;
  if (!order) return;

  const externalId = order.external_id as string | undefined;
  const reason = (order.error as string) || "Unknown error";

  if (!externalId?.startsWith("volcity_order_")) {
    console.warn("[webhook/printful] order_failed: unrecognised external_id:", externalId);
    return;
  }

  const stripeSessionId = externalId.replace("volcity_order_", "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db2 = getSupabaseAdmin() as any;
  const { error } = await db2
    .from("orders")
    .update({
      fulfillment_status: "failed",
      fulfillment_notes: `Printful order failed: ${reason}`,
    })
    .eq("stripe_session_id", stripeSessionId);

  if (error) {
    console.error("[webhook/printful] failed to update order on failure:", error, { stripeSessionId });
  } else {
    console.log("[webhook/printful] order marked failed:", stripeSessionId, "reason:", reason);
  }

  // TODO: notify store owner of fulfillment failure (Part 8 / email service)
}
