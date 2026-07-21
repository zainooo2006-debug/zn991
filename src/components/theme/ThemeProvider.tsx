import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteTheme } from "@/lib/theme.functions";

/**
 * Dynamic theme reader.
 * Reads `active_theme_json` from Supabase and applies theme.colors/fonts/spacing
 * as CSS variables on <html>. Falls back to built-in CSS defaults when no theme
 * exists. Kept intentionally minimal — expandable to layout/components later.
 */

type ThemeJson = {
  theme?: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    spacing?: Record<string, string>;
  };
  layout?: Record<string, unknown>;
  components?: Record<string, unknown>;
};

function applyTheme(theme: ThemeJson | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Clear previously applied dynamic vars
  const prev = (root as unknown as { __zainThemeKeys?: string[] }).__zainThemeKeys;
  if (prev) prev.forEach((k) => root.style.removeProperty(k));
  const applied: string[] = [];

  const set = (prefix: string, obj?: Record<string, string>) => {
    if (!obj) return;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== "string") continue;
      const cssVar = `--${prefix}-${k}`;
      root.style.setProperty(cssVar, v);
      applied.push(cssVar);
    }
  };

  set("color", theme?.theme?.colors);
  set("font", theme?.theme?.fonts);
  set("space", theme?.theme?.spacing);

  (root as unknown as { __zainThemeKeys?: string[] }).__zainThemeKeys = applied;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const fetchTheme = useServerFn(getSiteTheme);
  const { data } = useQuery({
    queryKey: ["site-theme"],
    queryFn: () => fetchTheme(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const active = (data?.active_theme_json ?? null) as ThemeJson | null;
    applyTheme(active);
  }, [data]);

  // Live-preview bridge for the Website Builder editor.
  // Parent posts { source:'zain-preview', kind:'theme'|'reload', json? }.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string; json?: unknown } | null;
      if (!d || d.source !== "zain-preview") return;
      if (d.kind === "theme") applyTheme(d.json as ThemeJson);
      else if (d.kind === "reload") window.location.reload();
    };
    window.addEventListener("message", onMsg);
    try { window.parent?.postMessage({ source: "zain-preview", kind: "ready" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return <>{children}</>;
}
