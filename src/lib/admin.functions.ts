import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { supabasePublic } from "./public-backend.server";
import { assertAdmin, verifyAdminPassword, signToken, base64ToBytes } from "./admin-auth.server";
import { ORDER_STATUS_VALUES } from "./order-status";
import { recordOrderStatus } from "./order-history.server";
import { enforceRateLimit } from "./rate-limit.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyCoupon,
  releaseCoupon,
  releaseStock,
  reserveStock,
  toStockItems,
} from "./shop-rules.server";

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

/* ============ Admin login ============ */

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    // Brute-force protection: 8 attempts per 15 minutes per IP.
    await enforceRateLimit(
      "admin-login",
      8,
      900,
      "محاولات كثيرة، انتظر 15 دقيقة ثم حاول من جديد",
    );
    if (!verifyAdminPassword(data.password)) {
      throw new Error("كلمة المرور غير صحيحة");
    }
    const token = signToken({ exp: Date.now() + SESSION_TTL_MS });
    return { token };
  });

/* ============ Orders (public create, admin list/update) ============ */

// Orders table also has newer columns (discount, coupon_code, stock_state);
// read them untyped so this compiles before the generated types are refreshed.
const ordersDb = () => supabaseAdmin as unknown as SupabaseClient;

/** Result for an order that already exists (double tap / retry of the same checkout). */
async function existingOrderResult(id: string) {
  const { data: o } = await ordersDb()
    .from("orders")
    .select("subtotal, discount, total, coupon_code")
    .eq("id", id)
    .maybeSingle();
  return {
    id,
    duplicate: true as boolean,
    subtotal: Number(o?.subtotal ?? 0),
    discount: Number(o?.discount ?? 0),
    total: Number(o?.total ?? 0),
    coupon_code: ((o?.coupon_code as string | null) ?? null) as string | null,
  };
}

const cartItemSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  price: z.number().min(0),
  qty: z.number().int().min(1).max(999),
  image: z.string().optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        customer_name: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(6).max(30),
        address: z.string().trim().max(500).optional().nullable(),
        items: z.array(cartItemSchema).min(1).max(50),
        wallet_id: z.string().uuid().optional().nullable(),
        wallet_name: z.string().max(100).optional().nullable(),
        payment_ref: z.string().trim().max(100).optional().nullable(),
        notes: z.string().trim().max(1000).optional().nullable(),
        idempotency_key: z.string().trim().min(8).max(100).optional().nullable(),
        coupon_code: z.string().trim().max(40).optional().nullable(),
        visitor_id: z.string().max(100).optional().nullable(),
        session_id: z.string().max(100).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Already created with this key? Return it (double tap / network retry).
    if (data.idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (existing) return await existingOrderResult(existing.id as string);
    }

    // Spam protection: 10 orders per 10 minutes per IP.
    await enforceRateLimit(
      "create-order",
      10,
      600,
      "تم إرسال طلبات كثيرة، حاول بعد قليل",
      { skipUnknownIp: true },
    );

    // Server-trusted prices — fetch from DB, never trust client-supplied prices.
    const productIds = data.items.map((i) => i.id);
    const { data: dbProducts, error: pErr } = await supabasePublic
      .from("products")
      .select("id, name, price, images")
      .in("id", productIds);
    if (pErr) {
      console.error("[createOrder] product lookup error:", pErr);
      throw new Error("تعذّر إنشاء الطلب، الرجاء المحاولة لاحقاً");
    }
    const priceMap = new Map((dbProducts ?? []).map((p) => [p.id, p]));

    const trustedItems = data.items.map((i) => {
      const p = priceMap.get(i.id);
      if (!p) throw new Error("منتج غير متوفر، الرجاء تحديث السلة");
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        qty: i.qty,
        image: (p.images && p.images[0]) || i.image,
      };
    });
    const subtotal = trustedItems.reduce((s, i) => s + i.price * i.qty, 0);

    // Stock: take the quantities now, all items or none (atomic in the database).
    const stockItems = toStockItems(trustedItems);
    await reserveStock(stockItems);

    // Coupon: validated against the server-side subtotal; one use is counted.
    let discount = 0;
    let couponCode: string | null = null;
    if (data.coupon_code && data.coupon_code.trim()) {
      try {
        const applied = await applyCoupon(data.coupon_code, subtotal, true);
        discount = applied.discount;
        couponCode = applied.code;
      } catch (e) {
        await releaseStock(stockItems);
        throw e;
      }
    }
    const total = subtotal - discount;

    const orderId = crypto.randomUUID();
    // Orders are inserted via the service-role client — public INSERT access
    // to orders was intentionally dropped (see migration 20260524021716),
    // so the anon client can no longer create rows here.
    const orderRow = {
      id: orderId,
      customer_name: data.customer_name,
      phone: data.phone,
      address: data.address ?? null,
      items: trustedItems,
      subtotal,
      discount,
      total,
      coupon_code: couponCode,
      stock_state: stockItems.length > 0 ? "reserved" : "none",
      wallet_id: data.wallet_id ?? null,
      wallet_name: data.wallet_name ?? null,
      payment_ref: data.payment_ref ?? null,
      notes: data.notes ?? null,
      idempotency_key: data.idempotency_key ?? null,
    };
    const { error } = await supabaseAdmin.from("orders").insert(orderRow);
    if (error) {
      // The order was not saved: give back the stock and the coupon use.
      await releaseStock(stockItems);
      await releaseCoupon(couponCode);
      // Two identical requests raced: the other one won. Return its order.
      if ((error as { code?: string }).code === "23505" && data.idempotency_key) {
        const { data: winner } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("idempotency_key", data.idempotency_key)
          .maybeSingle();
        if (winner) return await existingOrderResult(winner.id as string);
      }
      console.error("[createOrder] DB error:", error);
      throw new Error("تعذّر إنشاء الطلب، الرجاء المحاولة لاحقاً");
    }

    await recordOrderStatus(orderId, null, "new", { changedBy: "customer", source: "checkout" });

    try {
      const { notifyAdmin } = await import("./push.server");
      const count = trustedItems.reduce((s, i) => s + i.qty, 0);
      await notifyAdmin({
        type: "order",
        title: "طلب جديد",
        body: `العميل: ${data.customer_name} — ${count} منتج — الإجمالي: ${total.toLocaleString("ar-EG")}`,
        ref_id: orderId,
      });
    } catch (e) {
      console.error("[createOrder] notify failed:", e);
    }

    // Analytics: order_completed (recorded on the server so it can't be faked or missed).
    try {
      await supabaseAdmin.from("analytics_events").insert({
        event_name: "order_completed",
        visitor_id: data.visitor_id ?? null,
        session_id: data.session_id ?? null,
        page: "/checkout",
        device_type: "unknown",
        source: "checkout",
        metadata: {
          order_id: orderId,
          total,
          discount,
          coupon: couponCode,
          items_count: trustedItems.reduce((s, i) => s + i.qty, 0),
          payment: data.wallet_name ?? null,
        } as never,
      });
    } catch (e) {
      console.error("[createOrder] analytics failed:", e);
    }

    return {
      id: orderId,
      duplicate: false as boolean,
      subtotal,
      discount,
      total,
      coupon_code: couponCode,
    };
  });

export const listOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    return rows ?? [];
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid(),
        status: z.enum(ORDER_STATUS_VALUES),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const client = ordersDb();
    const { data: prev } = await client
      .from("orders")
      .select("status, items, stock_state")
      .eq("id", data.id)
      .maybeSingle();
    if (!prev) throw new Error("الطلب غير موجود");

    // Stock follows the order: cancelling gives the units back, re-opening a
    // cancelled order takes them again (and fails if they are no longer there).
    const stockItems = toStockItems(prev.items);
    const prevState = String(prev.stock_state ?? "none");
    const isCancelling = data.status === "cancelled" && prev.status !== "cancelled";
    const isReopening = data.status !== "cancelled" && prev.status === "cancelled";
    let nextState: string | null = null;
    let undo: (() => Promise<unknown>) | null = null;

    if (isCancelling && prevState === "reserved") {
      await releaseStock(stockItems);
      nextState = "released";
      undo = () => reserveStock(stockItems);
    } else if (isReopening && prevState === "released") {
      await reserveStock(stockItems); // throws an Arabic message if stock is short
      nextState = "reserved";
      undo = () => releaseStock(stockItems);
    }

    const patch: Record<string, unknown> = { status: data.status };
    if (nextState) patch.stock_state = nextState;

    // When stock moved, only apply the change if nobody else moved it first
    // (stops a double click from giving the same units back twice).
    let q = client.from("orders").update(patch).eq("id", data.id);
    if (nextState) q = q.eq("stock_state", prevState);
    const { data: updated, error } = await q.select("id");
    if (error || (nextState && (!updated || updated.length === 0))) {
      if (undo) {
        try {
          await undo();
        } catch (e) {
          console.error("[updateOrderStatus] stock undo failed:", e);
        }
      }
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
      throw new Error("تغيّرت حالة الطلب من جهة أخرى، حدّث الصفحة وحاول من جديد");
    }
    if (prev.status !== data.status) {
      await recordOrderStatus(data.id, prev.status as string, data.status, {
        changedBy: "admin",
        source: "admin",
      });
    }
    return { ok: true };
  });

export const deleteOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: row, error: selErr } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (selErr) {
      console.error("[server] DB error:", selErr);
      throw new Error("حدث خطأ");
    }
    if (!row) throw new Error("الطلب غير موجود");
    if (row.status !== "delivered" && row.status !== "cancelled") {
      throw new Error("يمكن حذف الطلبات المكتملة أو الملغية فقط");
    }
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ");
    }
    return { ok: true };
  });

/* ============ Reviews (admin) ============ */

export const listAllReviews = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        maxRating: z.number().int().min(1).max(5).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    let q = supabaseAdmin
      .from("product_reviews")
      .select("id, product_id, customer_name, rating, comment, created_at, products(name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.maxRating) q = q.lte("rating", data.maxRating);
    const { data: rows, error } = await q;
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ");
    }
    return rows ?? [];
  });

export const deleteReview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { error } = await supabaseAdmin.from("product_reviews").delete().eq("id", data.id);
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ");
    }
    return { ok: true };
  });

/* ============ Generic helpers ============ */

const TABLES = [
  "products",
  "categories",
  "service_categories",
  "packages",
  "wallets",
  "site_content",
] as const;

export const adminDelete = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        table: z.enum(TABLES),
        id: z.string(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const col = data.table === "site_content" ? "key" : "id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin.from(data.table) as any).delete().eq(col, data.id);
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    return { ok: true };
  });

/* ============ Products ============ */

const productSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z.number().min(0),
  old_price: z.number().min(0).optional().nullable(),
  images: z.array(z.string()).max(10).default([]),
  category_id: z.string().uuid().optional().nullable(),
  is_bestseller: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  in_stock: z.boolean().optional(),
  // null = quantity not tracked (unlimited); a number = units left in stock
  stock_qty: z.number().int().min(0).max(1_000_000).nullable().optional(),
});

export const saveProduct = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: productSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    // With a tracked quantity, availability follows it (0 = sold out).
    const payload = { ...data.data };
    if (typeof payload.stock_qty === "number") payload.in_stock = payload.stock_qty > 0;
    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(payload).eq("id", data.id);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    } else {
      const { error } = await supabaseAdmin.from("products").insert(payload);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    }
    return { ok: true };
  });

/* ============ Categories ============ */

const categorySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/i),
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: categorySchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    if (data.id) {
      const { error } = await supabaseAdmin.from("categories").update(data.data).eq("id", data.id);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    } else {
      const { error } = await supabaseAdmin.from("categories").insert(data.data);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    }
    return { ok: true };
  });

/* ============ Services ============ */

const serviceSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/i),
  name: z.string().trim().min(1).max(100),
  short_desc: z.string().trim().max(300).optional().nullable(),
  long_desc: z.string().trim().max(5000).optional().nullable(),
  image_url: z.string().trim().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const saveService = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: serviceSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("service_categories")
        .update(data.data)
        .eq("id", data.id);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    } else {
      const { error } = await supabaseAdmin.from("service_categories").insert(data.data);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    }
    return { ok: true };
  });

/* ============ Wallets ============ */

const walletSchema = z.object({
  name: z.string().trim().min(1).max(100),
  account_number: z.string().trim().min(1).max(50),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const saveWallet = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: walletSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    if (data.id) {
      const { error } = await supabaseAdmin.from("wallets").update(data.data).eq("id", data.id);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    } else {
      const { error } = await supabaseAdmin.from("wallets").insert(data.data);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    }
    return { ok: true };
  });

/* ============ Packages ============ */

const packageSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.string().trim().min(1).max(50),
  old_price: z.string().trim().max(50).optional().nullable(),
  features: z.array(z.string().max(200)).max(20).default([]),
  badge: z.string().trim().max(50).optional().nullable(),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export const savePackage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        data: packageSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    if (data.id) {
      const { error } = await supabaseAdmin.from("packages").update(data.data).eq("id", data.id);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    } else {
      const { error } = await supabaseAdmin.from("packages").insert(data.data);
      if (error) {
        console.error("[server] DB error:", error);
        throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
      }
    }
    return { ok: true };
  });

/* ============ Site Content (key/value) ============ */

const RESERVED_CONTENT_KEYS = new Set(["coupons"]);

export const saveContent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        key: z.string().trim().min(1).max(80),
        value: z.unknown(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    // Coupons must never be stored in publicly-readable site_content.
    if (RESERVED_CONTENT_KEYS.has(data.key)) {
      throw new Error("هذا المفتاح محجوز ولا يمكن تخزينه هنا");
    }
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ key: data.key, value: data.value as never }, { onConflict: "key" });
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    return { ok: true };
  });

/* ============ Image Upload (base64) — strict MIME + extension allowlist ============ */

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const ALLOWED_IMAGE_EXTS = /\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadImage = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        filename: z.string().trim().min(1).max(150),
        contentType: z.string().trim().min(1).max(100),
        base64: z.string().min(1).max(8_000_000), // ~6 MB encoded cap
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);

    // Strict MIME allowlist — block HTML/SVG/JS uploads to the public bucket.
    if (!ALLOWED_IMAGE_TYPES.has(data.contentType.toLowerCase())) {
      throw new Error("نوع الملف غير مسموح به. الصور فقط (JPEG/PNG/WEBP/GIF/AVIF).");
    }
    if (!ALLOWED_IMAGE_EXTS.test(data.filename)) {
      throw new Error("امتداد الملف غير مسموح به.");
    }

    const buffer = base64ToBytes(data.base64);
    if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error("حجم الملف غير صالح (الحد الأقصى 5MB).");
    }

    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `uploads/${Date.now()}-${safe}`;
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, buffer, { contentType: data.contentType.toLowerCase(), upsert: false });
    if (error) {
      console.error("[server] DB error:", error);
      throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً");
    }
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);
    return { url: pub.publicUrl, path };
  });
