import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Coupons + inventory helpers (server only).
// They talk to the database through atomic SQL functions created by
// supabase/migrations/20261002120000_coupons_inventory.sql, and are written
// untyped so they compile whether or not the generated Supabase types know
// about the new columns yet.
const db = () => supabaseAdmin as unknown as SupabaseClient;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StockItem = { id: string; qty: number };

/** Keeps only real product rows (quote orders use ids like "quote-1") and merges duplicates. */
export function toStockItems(items: unknown): StockItem[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, number>();
  for (const raw of items) {
    const o = raw as Record<string, unknown>;
    const id = String(o?.id ?? "");
    const qty = Math.floor(Number(o?.qty ?? 0));
    if (!UUID_RE.test(id) || !(qty > 0)) continue;
    map.set(id, (map.get(id) ?? 0) + qty);
  }
  return [...map.entries()].map(([id, qty]) => ({ id, qty }));
}

function stockMessage(raw: string): string {
  const msg = raw || "";
  const out = /STOCK_OUT:(.*)$/.exec(msg);
  if (out) return `نفدت الكمية من «${out[1].trim()}»، الرجاء إزالته من السلة`;
  const low = /STOCK_LOW:(.*):(\d+)\s*$/.exec(msg);
  if (low) {
    const left = Number(low[2]);
    return left > 0
      ? `الكمية المطلوبة من «${low[1].trim()}» غير متوفرة، المتبقي ${left} فقط`
      : `نفدت الكمية من «${low[1].trim()}»، الرجاء إزالته من السلة`;
  }
  if (msg.includes("STOCK_MISSING")) return "منتج غير متوفر، الرجاء تحديث السلة";
  return "";
}

/** Deducts stock for all items or for none of them. Throws an Arabic message on failure. */
export async function reserveStock(items: StockItem[]) {
  if (items.length === 0) return;
  const { error } = await db().rpc("reserve_order_stock", { p_items: items });
  if (error) {
    const friendly = stockMessage(error.message);
    if (friendly) throw new Error(friendly);
    console.error("[stock] reserve failed:", error);
    throw new Error("تعذّر إنشاء الطلب، الرجاء المحاولة لاحقاً");
  }
}

/** Gives stock back. Never throws: a failure here is logged and must not hide the real result. */
export async function releaseStock(items: StockItem[]): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    const { error } = await db().rpc("release_order_stock", { p_items: items });
    if (error) {
      console.error("[stock] release failed:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[stock] release failed:", e);
    return false;
  }
}

function couponMessage(raw: string): string {
  const msg = raw || "";
  if (msg.includes("COUPON_INVALID")) return "كود الخصم غير صحيح";
  if (msg.includes("COUPON_INACTIVE")) return "كود الخصم غير مفعّل";
  if (msg.includes("COUPON_NOT_STARTED")) return "كود الخصم لم يبدأ بعد";
  if (msg.includes("COUPON_EXPIRED")) return "انتهت صلاحية كود الخصم";
  if (msg.includes("COUPON_EXHAUSTED")) return "تم استهلاك كود الخصم بالكامل";
  const min = /COUPON_MIN_ORDER:([\d.]+)/.exec(msg);
  if (min) return `الحد الأدنى للطلب لاستخدام هذا الكود ${Number(min[1]).toLocaleString("en-US")} ر.ي`;
  return "";
}

/**
 * Validates a coupon against `subtotal` and returns the discount.
 * commit=false only checks (preview); commit=true also counts one use, atomically.
 */
export async function applyCoupon(code: string, subtotal: number, commit: boolean) {
  const { data, error } = await db().rpc("apply_coupon", {
    p_code: code,
    p_subtotal: subtotal,
    p_commit: commit,
  });
  if (error) {
    const friendly = couponMessage(error.message);
    if (friendly) throw new Error(friendly);
    console.error("[coupon] apply failed:", error);
    throw new Error("تعذّر التحقق من كود الخصم، حاول لاحقاً");
  }
  const r = data as { code: string; discount: number | string };
  return { code: String(r.code), discount: Number(r.discount) || 0 };
}

/** Gives one coupon use back. Never throws. */
export async function releaseCoupon(code: string | null | undefined) {
  if (!code) return;
  try {
    const { error } = await db().rpc("release_coupon", { p_code: code });
    if (error) console.error("[coupon] release failed:", error);
  } catch (e) {
    console.error("[coupon] release failed:", e);
  }
}
