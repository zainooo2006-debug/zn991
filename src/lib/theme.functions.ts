import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Theme Manager — public read + admin write.
 * Storage: public.site_settings (singleton row).
 * Structure supports future expansion (theme, layout, components).
 */

function verifyAdminToken(token: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Server misconfigured");
  if (!token || !token.includes(".")) throw new Error("غير مصرح");
  const [body, sig] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("غير مصرح");
  let payload: { exp?: number };
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); }
  catch { throw new Error("غير مصرح"); }
  if (!payload.exp || Date.now() > payload.exp) throw new Error("انتهت الجلسة");
}

const themeShape = z.object({}).catchall(z.unknown());

export const getSiteTheme = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("id, active_theme_json, default_theme_json, updated_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) { console.error("[getSiteTheme]", error); return null; }
  return data;
});

export const saveTheme = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      password: z.string(),
      active_theme_json: themeShape,
    }).parse(d),
  )
  .handler(async ({ data }) => {
    verifyAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("site_settings").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin
        .from("site_settings")
        .update({ active_theme_json: data.active_theme_json })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("site_settings")
        .insert({ active_theme_json: data.active_theme_json, default_theme_json: data.active_theme_json });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const restoreDefaultTheme = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    verifyAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("site_settings")
      .select("id, default_theme_json")
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (selErr || !row) throw new Error("لا يوجد مظهر افتراضي محفوظ");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ active_theme_json: row.default_theme_json })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true, default_theme_json: row.default_theme_json };
  });

export const setDefaultTheme = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ password: z.string(), default_theme_json: themeShape }).parse(d),
  )
  .handler(async ({ data }) => {
    verifyAdminToken(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("site_settings").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (!existing) throw new Error("لا يوجد سجل إعدادات");
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ default_theme_json: data.default_theme_json })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
