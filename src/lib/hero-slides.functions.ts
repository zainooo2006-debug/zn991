import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";
import { supabasePublic } from "./public-backend.server";

/* ============ Public ============ */

export const listPublicHeroSlides = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabasePublic
    .from("hero_slides")
    .select("id, image_url, alt_text, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[hero] list error:", error);
    return [];
  }
  return data ?? [];
});

/* ============ Admin ============ */

export const adminListHeroSlides = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("hero_slides")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const slideSchema = z.object({
  image_url: z.string().trim().url().max(1000),
  alt_text: z.string().trim().max(200).nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const adminSaveHeroSlide = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        values: slideSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("hero_slides")
        .update(data.values)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("hero_slides").insert(data.values);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminUpdateHeroSlideFlags = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid(),
        is_active: z.boolean().optional(),
        sort_order: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { is_active?: boolean; sort_order?: number } = {};
    if (typeof data.is_active === "boolean") patch.is_active = data.is_active;
    if (typeof data.sort_order === "number") patch.sort_order = data.sort_order;
    const { error } = await supabaseAdmin.from("hero_slides").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteHeroSlide = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("hero_slides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Admin: upload hero image ============ */

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const adminUploadHeroImage = createServerFn({ method: "POST" })
  .inputValidator((d) => {
    if (!(d instanceof FormData)) throw new Error("Invalid form data");
    const password = d.get("password");
    const file = d.get("file");
    if (typeof password !== "string") throw new Error("غير مصرح");
    if (!(file instanceof File)) throw new Error("لم يتم اختيار ملف");
    if (!ALLOWED_TYPES.has(file.type)) throw new Error("نوع الصورة غير مدعوم (JPG/PNG/WebP)");
    if (file.size > MAX_IMAGE_BYTES) throw new Error("حجم الصورة كبير جداً (الحد 8MB)");
    return { password, file };
  })
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const { error } = await supabaseAdmin.storage.from("media").upload(path, bytes, {
      contentType: data.file.type,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("media").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
