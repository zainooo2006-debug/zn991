import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertAdmin } from "./admin-auth.server";


/* ============ Public: list approved active centers ============ */

export const listPublicCenters = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("installation_centers")
    .select(
      "id, name, city, address, phone, whatsapp, google_maps_url, logo_url, images, services, sort_order",
    )
    .eq("is_approved", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) {
    console.error("[centers] list error:", error);
    throw new Error("تعذّر تحميل المراكز");
  }
  return data ?? [];
});

export const getPublicCenterById = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("installation_centers")
      .select(
        "id, name, city, address, phone, whatsapp, google_maps_url, logo_url, images, services, sort_order",
      )
      .eq("id", data.id)
      .eq("is_approved", true)
      .eq("is_active", true)
      .single();
    if (error || !row) throw new Error("المركز غير موجود أو غير معتمد");
    return row;
  });

/* ============ Admin ============ */

export const adminListCenters = createServerFn({ method: "POST" })

  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("installation_centers")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const centerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(1).max(80),
  address: z.string().trim().max(300).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  google_maps_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  logo_url: z
    .string()
    .trim()
    .url()
    .max(500)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  images: z.array(z.string().trim().url().max(500)).max(20).default([]),
  services: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  is_active: z.boolean().default(true),
  is_approved: z.boolean().default(false),
  sort_order: z.number().int().default(0),
});

export const adminSaveCenter = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid().optional().nullable(),
        values: centerSchema,
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("installation_centers")
        .update(data.values)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("installation_centers").insert(data.values);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminUpdateCenterFlags = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        id: z.string().uuid(),
        is_approved: z.boolean().optional(),
        is_active: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { is_approved?: boolean; is_active?: boolean } = {};
    if (typeof data.is_approved === "boolean") patch.is_approved = data.is_approved;
    if (typeof data.is_active === "boolean") patch.is_active = data.is_active;
    const { error } = await supabaseAdmin
      .from("installation_centers")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCenter = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("installation_centers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
