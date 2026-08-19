import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ============ Public: list approved reviews ============ */

export const listApprovedReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("customer_reviews")
    .select("id, customer_name, city, rating, comment, images, is_featured, created_at")
    .eq("is_approved", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) { console.error("[reviews] list error:", error); throw new Error("تعذّر تحميل التقييمات"); }
  return data ?? [];
});

/* ============ Public: submit review (pending) ============ */

const submitSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  city: z.string().trim().max(60).optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
  images: z.array(z.string().url()).max(3).optional().default([]),
});

export const submitCustomerReview = createServerFn({ method: "POST" })
  .inputValidator((d) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_reviews").insert({
      customer_name: data.customer_name,
      city: data.city || null,
      rating: data.rating,
      comment: data.comment,
      images: data.images ?? [],
      is_approved: false,
      is_featured: false,
    });
    if (error) { console.error("[reviews] submit error:", error); throw new Error("تعذّر إرسال التقييم"); }

    try {
      const { notifyAdmin } = await import("./push.server");
      await notifyAdmin({
        type: "customer_review",
        title: "تقييم جديد من عميل",
        body: `${data.customer_name} — ${"★".repeat(data.rating)}${"☆".repeat(Math.max(0, 5 - data.rating))} (${data.rating}/5)`,
      });
    } catch (e) {
      console.error("[reviews] notify failed:", e);
    }

    return { ok: true };
  });

/* ============ Public: upload review image (limited) ============ */

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const uploadReviewImage = createServerFn({ method: "POST" })
  .inputValidator((d) => {
    if (!(d instanceof FormData)) throw new Error("Invalid form data");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("لم يتم اختيار ملف");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("نوع الصورة غير مدعوم");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("حجم الصورة كبير جداً (الحد 3MB)");
    return { file };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const { error } = await supabaseAdmin.storage.from("media").upload(path, bytes, {
      contentType: data.file.type,
      upsert: false,
    });
    if (error) { console.error("[reviews] upload error:", error); throw new Error("تعذّر رفع الصورة"); }
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

/* ============ Admin ============ */

import { createHmac, timingSafeEqual } from "crypto";

function verifyAdmin(token: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Server misconfigured");
  if (!token?.includes(".")) throw new Error("غير مصرح");
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("غير مصرح");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { exp?: number };
  if (!payload.exp || Date.now() > payload.exp) throw new Error("انتهت الجلسة");
}

export const adminListCustomerReviews = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    password: z.string(),
    status: z.enum(["all", "pending", "approved"]).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    verifyAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("customer_reviews")
      .select("id, customer_name, city, rating, comment, images, is_approved, is_featured, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status === "pending") q = q.eq("is_approved", false);
    if (data.status === "approved") q = q.eq("is_approved", true);
    const { data: rows, error } = await q;
    if (error) { console.error("[reviews] admin list error:", error); throw new Error("خطأ في التحميل"); }
    return rows ?? [];
  });

export const adminUpdateCustomerReview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    password: z.string(),
    id: z.string().uuid(),
    is_approved: z.boolean().optional(),
    is_featured: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    verifyAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { is_approved?: boolean; is_featured?: boolean } = {};
    if (typeof data.is_approved === "boolean") patch.is_approved = data.is_approved;
    if (typeof data.is_featured === "boolean") patch.is_featured = data.is_featured;
    const { error } = await supabaseAdmin.from("customer_reviews").update(patch).eq("id", data.id);
    if (error) { console.error("[reviews] update error:", error); throw new Error("خطأ في التحديث"); }
    return { ok: true };
  });

export const adminDeleteCustomerReview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    verifyAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_reviews").delete().eq("id", data.id);
    if (error) { console.error("[reviews] delete error:", error); throw new Error("خطأ في الحذف"); }
    return { ok: true };
  });
