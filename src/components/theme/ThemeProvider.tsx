import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getActiveWebsiteTheme } from "@/lib/theme-engine.functions";

/**
 * Theme Engine — loads the active theme from website_themes (is_active=true),
 * flattens it into CSS custom properties on :root, and listens for postMessage
 * updates from the Website Builder Live Preview.
 *
 * Mapping rules (all keys are lowercased-kebab):
 *   colors.<k>   -> --<k>  AND  --color-<k>
 *   fonts.<k>    -> --font-<k>
 *   spacing.<k>  -> --space-<k>  AND  --spacing-<k>
 *   radius.<k>   -> --radius-<k>  (and --radius when key is "base")
 *   shadows.<k>  -> --shadow-<k>
 *   buttons.<k>  -> --btn-<k>
 */

type ThemeJson = {
  colors?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  shadows?: Record<string, string>;
  buttons?: Record<string, string>;
  // legacy nested container
  theme?: ThemeJson;
};

function applyTheme(theme: ThemeJson | null | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prev = (root as unknown as { __zainThemeKeys?: string[] }).__zainThemeKeys;
  if (prev) prev.forEach((k) => root.style.removeProperty(k));
  const applied: string[] = [];
  const t: ThemeJson = (theme?.theme ?? theme ?? {}) as ThemeJson;

  const write = (name: string, v: string) => {
    root.style.setProperty(name, v);
    applied.push(name);
  };

  if (t.colors) {
    for (const [k, v] of Object.entries(t.colors)) {
      if (typeof v !== "string") continue;
      write(`--${k}`, v);
      write(`--color-${k}`, v);
    }
  }
  if (t.fonts) {
    for (const [k, v] of Object.entries(t.fonts)) {
      if (typeof v !== "string") continue;
      write(`--font-${k}`, v);
    }
  }
  if (t.spacing) {
    for (const [k, v] of Object.entries(t.spacing)) {
      if (typeof v !== "string") continue;
      write(`--space-${k}`, v);
      write(`--spacing-${k}`, v);
    }
  }
  if (t.radius) {
    for (const [k, v] of Object.entries(t.radius)) {
      if (typeof v !== "string") continue;
      write(`--radius-${k}`, v);
      if (k === "base") write(`--radius`, v);
    }
  }
  if (t.shadows) {
    for (const [k, v] of Object.entries(t.shadows)) {
      if (typeof v !== "string") continue;
      write(`--shadow-${k}`, v);
    }
  }
  if (t.buttons) {
    for (const [k, v] of Object.entries(t.buttons)) {
      if (typeof v !== "string") continue;
      write(`--btn-${k}`, v);
    }
  }

  (root as unknown as { __zainThemeKeys?: string[] }).__zainThemeKeys = applied;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const fetchTheme = useServerFn(getActiveWebsiteTheme);
  const { data } = useQuery({
    queryKey: ["active-website-theme"],
    queryFn: () => fetchTheme(),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    applyTheme((data?.theme_json ?? null) as ThemeJson | null);
  }, [data]);

  // Live preview bridge: parent posts { source:'zain-preview', kind:'theme'|'reload', json? }
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
