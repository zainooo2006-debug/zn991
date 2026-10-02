import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabasePublic } from "./public-backend.server";
import { assertAdmin } from "./admin-auth.server";
import { enforceRateLimit } from "./rate-limit.server";
import { applyCoupon } from "./shop-rules.server";

// Coupons are a new table; talk to it untyped so this compiles whether or not
// the generated Supabase types already include it.
const db = () => supabaseAdmin as unknown as SupabaseClient;

function fail(e: unknown): never {
  console.error("[coupons] DB error:", e);
  throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
}

export type CouponRow = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_order: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
};

/* ============ Public: customer checks a code (no use is counted) ============ */

export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(1).max(40),
        items: z
          .array(
            z.object({
              id: z.string().uuid(),
              qty: z.number().int().min(1).max(999),
            }),
          )
          .min(1)
          .max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Stops people from guessing codes: 20 checks per 10 minutes per IP.
    await enforceRateLimit(
      "coupon-check",
      20,
      600,
      "محاولات كثيرة، حاول بعد قليل",
      { skipUnknownIp: true },
    );

    // The subtotal always comes from the database, never from the browser.
    const ids = [...new Set(data.items.map((i) => i.id))];
    const { data: rows, error } = await supabasePublic
      .from("products")
      .select("id, price")
      .in("id", ids);
    if (error) fail(error);
    const priceMap = new Map((rows ?? []).map((p) => [p.id, Number(p.price)]));
    let subtotal = 0;
    for (const i of data.items) {
      const price = priceMap.get(i.id);
      if (price == null) throw new Error("منتج غير متوفر، الرجاء تحديث السلة");
      subtotal += price * i.qty;
    }

    const r = await applyCoupon(data.code, subtotal, false);
    return { code: r.code, discount: r.discount, subtotal, total: subtotal - r.discount };
  });

/* ============ Admin ============ */

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "الكود: أحرف إنجليزية وأرقام فقط (بدون مسافات)"),
    kind: z.enum(["percent", "fixed"]),
    value: z.number().gt(0).max(1_000_000_000),
    min_order: z.number().min(0).max(1_000_000_000).default(0),
    max_discount: z.number().gt(0).max(1_000_000_000).optional().nullable(),
    max_uses: z.number().int().min(1).max(1_000_000).optional().nullable(),
    starts_at: z.string().max(40).optional().nullable(),
    expires_at: z.string().max(40).optional().nullable(),
    is_active: z.boolean().default(true),
    note: z.string().trim().max(300).optional().nullable(),
  })
  .refine((d) => d.kind !== "percent" || d.value <= 100, {
    message: "نسبة الخصم لا تزيد عن 100%",
  });

export const listCoupons = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await db()
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) fail(error);
    return (rows ?? []).map((r) => ({
      ...(r as Record<string, unknown>),
      value: Number(r.value),
      min_order: Number(r.min_order ?? 0),
      max_discount: r.max_discount == null ? null : Number(r.max_discount),
    })) as CouponRow[];
  });

export const saveCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: couponSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const c = data.data;
    const row = {
      code: c.code.toUpperCase(),
      kind: c.kind,
      value: c.value,
      min_order: c.min_order,
      max_discount: c.kind === "percent" ? (c.max_discount ?? null) : null,
      max_uses: c.max_uses ?? null,
      starts_at: c.starts_at || null,
      expires_at: c.expires_at || null,
      is_active: c.is_active,
      note: c.note || null,
    };
    const res = data.id
      ? await db().from("coupons").update(row).eq("id", data.id)
      : await db().from("coupons").insert(row);
    if (res.error) {
      if ((res.error as { code?: string }).code === "23505") {
        throw new Error("هذا الكود مستخدم من قبل، اختر كوداً آخر");
      }
      fail(res.error);
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { error } = await db().from("coupons").delete().eq("id", data.id);
    if (error) fail(error);
    return { ok: true };
  });
