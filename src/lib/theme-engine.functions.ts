import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Theme Engine — public read for the active website theme,
 * admin write to switch the active theme atomically.
 */

export const DEFAULT_THEME_JSON = {
  colors: {
    primary: "oklch(0.78 0.13 85)",
    "primary-foreground": "oklch(0.18 0 0)",
    background: "oklch(1 0 0)",
    foreground: "oklch(0.18 0 0)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0.18 0 0)",
    muted: "oklch(0.97 0 0)",
    "muted-foreground": "oklch(0.42 0 0)",
    accent: "oklch(0.92 0.07 88)",
    "accent-foreground": "oklch(0.18 0 0)",
    border: "oklch(0.93 0 0)",
    input: "oklch(0.93 0 0)",
    ring: "oklch(0.78 0.13 85)",
    gold: "#D4AF37",
    "gold-soft": "#F0DC9A",
    ink: "#0a0a0a",
    "ink-soft": "#333333",
    hairline: "#eeeeee",
    surface: "#fafafa",
  },
  // Optional per-color overrides applied only while the visitor's device is in dark mode.
  // Leave a key out to keep the light-mode color for that key in dark mode too.
  colors_dark: {} as Record<string, string>,
  fonts: {
    sans: '"Cairo", system-ui, sans-serif',
    heading: '"Cairo", system-ui, sans-serif',
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  radius: {
    base: "0.5rem",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
  },
  buttons: {
    "primary-bg": "var(--color-gold)",
    "primary-fg": "var(--color-ink)",
    "primary-radius": "9999px",
  },
  // Occasion identity extras — all optional, all backward compatible.
  background: {
    type: "color" as "color" | "gradient" | "image", // "color": plain bg color, "gradient": CSS gradient string in `value`, "image": image url in `value`
    value: "",
    overlay_opacity: "0", // 0 to 1 — dark overlay over a background image, helps text stay legible
  },
  logo_url: "", // overrides the site logo while this theme is active; empty = use the default logo
  decorative_url: "", // optional decorative corner/border image overlay (e.g. heritage motif, mosque silhouette)
} as const;

/** PUBLIC — returns active theme JSON. Fallback: DEFAULT_THEME_JSON. */
export const getActiveWebsiteTheme = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("website_themes")
        .select("id, name, theme_json, is_active")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (data?.theme_json) return { id: data.id, name: data.name, theme_json: data.theme_json };
    } catch (e) {
      console.error("[getActiveWebsiteTheme]", e);
    }
    return { id: null, name: "default", theme_json: DEFAULT_THEME_JSON };
  },
);

/** ADMIN — set a theme active and deactivate all others. */
export const setActiveWebsiteTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: a }, { data: s }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!a && !s) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { error: e1 } = await admin.from("website_themes").update({ is_active: false }).neq("id", data.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await admin.from("website_themes").update({ is_active: true }).eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

/** ADMIN — duplicate a theme */
export const duplicateWebsiteTheme = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [{ data: a }, { data: s }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!a && !s) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin: any = supabaseAdmin;
    const { data: src, error: e1 } = await admin
      .from("website_themes").select("name, theme_json").eq("id", data.id).maybeSingle();
    if (e1 || !src) throw new Error(e1?.message ?? "Not found");
    const { data: row, error } = await admin
      .from("website_themes")
      .insert({ name: `${src.name} (نسخة)`, theme_json: src.theme_json, is_active: false })
      .select().maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
