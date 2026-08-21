import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { assertAdmin } from "./admin.functions";

export const getSiteTheme = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("active_theme_json, default_theme_json")
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[getSiteTheme]", error);
    throw new Error("تعذّر جلب المظهر");
  }
  return {
    active_theme_json: (data?.active_theme_json ?? {}) as Json,
    default_theme_json: (data?.default_theme_json ?? {}) as Json,
  };
});

export const saveTheme = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        active_theme_json: z.unknown(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("site_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (selErr) {
      console.error("[saveTheme]", selErr);
      throw new Error("تعذّر حفظ المظهر");
    }
    const themeJson = data.active_theme_json as Json;
    if (existing) {
      const { error } = await supabaseAdmin
        .from("site_settings")
        .update({ active_theme_json: themeJson })
        .eq("id", existing.id);
      if (error) {
        console.error("[saveTheme]", error);
        throw new Error("تعذّر حفظ المظهر");
      }
    } else {
      const { error } = await supabaseAdmin.from("site_settings").insert({
        active_theme_json: themeJson,
        default_theme_json: {},
      });
      if (error) {
        console.error("[saveTheme]", error);
        throw new Error("تعذّر حفظ المظهر");
      }
    }
    return { ok: true };
  });

export const restoreDefaultTheme = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    assertAdmin(data.password);
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("site_settings")
      .select("id, default_theme_json")
      .limit(1)
      .maybeSingle();
    if (selErr || !existing) {
      console.error("[restoreDefaultTheme]", selErr);
      throw new Error("تعذّر استعادة المظهر");
    }
    const defaultTheme = (existing.default_theme_json ?? {}) as Json;
    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ active_theme_json: defaultTheme })
      .eq("id", existing.id);
    if (error) {
      console.error("[restoreDefaultTheme]", error);
      throw new Error("تعذّر استعادة المظهر");
    }
    return { default_theme_json: defaultTheme };
  });

