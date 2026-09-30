import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Records one order status change. Never throws: a history failure must not
 * break order creation or status updates.
 */
export async function recordOrderStatus(
  orderId: string,
  from: string | null,
  to: string,
  opts: { changedBy?: string; source?: string; note?: string | null } = {},
) {
  try {
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { error } = await db.from("order_status_history").insert({
      order_id: orderId,
      from_status: from,
      to_status: to,
      changed_by: opts.changedBy ?? "admin",
      source: opts.source ?? "admin",
      note: opts.note ?? null,
    });
    if (error) console.error("[order-history] insert error:", error);
  } catch (e) {
    console.error("[order-history] failed:", e);
  }
}
