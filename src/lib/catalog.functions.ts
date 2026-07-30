import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, icon, sort_order")
    .order("sort_order");
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

export const getServiceCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("service_categories")
    .select("id, slug, name, short_desc, long_desc, image_url, sort_order")
    .order("sort_order");
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

export const getServiceBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("service_categories")
      .select("id, slug, name, short_desc, long_desc, image_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
    return row;
  });

export const getProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, description, price, old_price, images, rating, is_bestseller, is_featured, category_id")
    .order("created_at", { ascending: false });
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

export const getFeaturedProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price, old_price, images, rating")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

export const getProductById = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id, name, description, price, old_price, images, video_url, rating, category_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
    return row;
  });

export const getPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("id, slug, name, description, price, old_price, features, badge, sort_order")
    .order("sort_order");
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

export const getWallets = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("id, name, account_number, sort_order")
    .order("sort_order");
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return data ?? [];
});

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("key, value");
  if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
  return (data ?? []) as Array<{ key: string; value: Json }>;
});

import { z } from "zod";

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("product_reviews")
      .select("id, customer_name, rating, comment, created_at")
      .eq("product_id", data.productId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
    return rows ?? [];
  });

const reviewSchema = z.object({
  productId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().nullable(),
});

export const submitProductReview = createServerFn({ method: "POST" })
  .inputValidator((input) => reviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("product_reviews").insert({
      product_id: data.productId,
      customer_name: data.customerName,
      rating: data.rating,
      comment: data.comment || null,
    });
    if (error) { console.error("[server] DB error:", error); throw new Error("تعذّر إرسال التقييم"); }
    return { ok: true };
  });

const phoneSchema = z.object({
  phone: z.string().trim().min(9).max(30),
  orderId: z.string().trim().min(4).max(64),
});

export const getOrdersByPhone = createServerFn({ method: "POST" })
  .inputValidator((input) => phoneSchema.parse(input))
  .handler(async ({ data }) => {
    // Require BOTH a full phone number AND an order ID prefix to prevent
    // enumeration of other customers' orders via phone-only lookup.
    const normalized = data.phone.replace(/\D/g, "");
    if (normalized.length < 9) return [];
    const orderIdPrefix = data.orderId.trim().toLowerCase();
    // Match orders whose id starts with the provided prefix AND whose phone
    // contains the normalized number. Return only non-PII fields.
    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, status, total, items")
      .ilike("id", `${orderIdPrefix}%`)
      .ilike("phone", `%${normalized}%`)
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) { console.error("[server] DB error:", error); throw new Error("حدث خطأ، الرجاء المحاولة لاحقاً"); }
    return rows ?? [];
  });

