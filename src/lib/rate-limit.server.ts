import type { SupabaseClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Best-effort client IP from the proxy headers. Returns "unknown" if none. */
export function clientIp(): string {
  try {
    const h = getRequest().headers;
    const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = h.get("cf-connecting-ip") || fwd || h.get("x-real-ip") || "";
    return ip.slice(0, 64) || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Throws `message` when `scope` was called more than `limit` times by this IP
 * inside `windowSeconds`.
 *
 * Fails OPEN: if the database function is missing or errors, the request is
 * allowed. A rate-limit problem must never take the shop down.
 *
 * `skipUnknownIp`: when the IP cannot be determined, don't limit (otherwise
 * every such visitor would share one bucket and block each other).
 */
export async function enforceRateLimit(
  scope: string,
  limit: number,
  windowSeconds: number,
  message: string,
  opts: { skipUnknownIp?: boolean } = {},
) {
  const ip = clientIp();
  if (ip === "unknown" && opts.skipUnknownIp) return;
  try {
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data, error } = await db.rpc("check_rate_limit", {
      p_key: `${scope}:${ip}`,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] rpc error (allowing):", error);
      return;
    }
    if (data === false) throw new Error(message);
  } catch (e) {
    if (e instanceof Error && e.message === message) throw e;
    console.error("[rate-limit] failed (allowing):", e);
  }
}
