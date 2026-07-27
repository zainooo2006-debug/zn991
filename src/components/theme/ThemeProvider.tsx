import { useEffect, useState } from "react";
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
 *   background   -> --site-bg-type / --site-bg-value / --site-bg-overlay
 *   logo_url     -> --site-logo-url (consumed by Header)
 *   decorative_url -> --site-decorative-url
 *
 * Dark mode: colors_dark holds optional per-key overrides applied only while
 * the site is in dark mode (see ThemeToggle). This is what keeps the day/night
 * toggle and the custom-identity system from fighting over the same CSS vars —
 * previously the theme always force-applied its light colors as inline styles,
 * which unconditionally beat the .dark stylesheet rules regardless of toggle state.
 */

export const DARK_MODE_EVENT = "zain-dark-mode-change";
const DARK_STORAGE_KEY = "mycar_theme";

type ThemeJson = {
  colors?: Record<string, string>;
  colors_dark?: Record<string, string>;
  fonts?: Record<string, string>;
  spacing?: Record<string, string>;
  radius?: Record<string, string>;
  shadows?: Record<string, string>;
  buttons?: Record<string, string>;
  background?: { type?: string; value?: string; overlay_opacity?: string };
  logo_url?: string;
  decorative_url?: string;
  // legacy nested container
  theme?: ThemeJson;
};

function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function applyTheme(theme: ThemeJson | null | undefined, isDark: boolean) {
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
    const merged = { ...t.colors, ...(isDark ? t.colors_dark ?? {} : {}) };
    for (const [k, v] of Object.entries(merged)) {
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
  if (t.background) {
    const bg = t.background;
    let bgImage = "none";
    if (bg.type === "image" && bg.value) bgImage = `url("${bg.value}")`;
    else if (bg.type === "gradient" && bg.value) bgImage = bg.value;
    write("--site-bg-image", bgImage);
    write("--site-bg-overlay", bg.overlay_opacity || "0");
    if (bg.type === "color" && bg.value) write("--color-background", bg.value);
  } else {
    write("--site-bg-image", "none");
    write("--site-bg-overlay", "0");
  }
  write("--site-logo-url", t.logo_url ? `url("${t.logo_url}")` : "none");
  write("--site-decorative-url", t.decorative_url ? `url("${t.decorative_url}")` : "none");

  (root as unknown as { __zainThemeKeys?: string[] }).__zainThemeKeys = applied;
}

export function useActiveThemeLogoUrl(): string | null {
  const fetchTheme = useServerFn(getActiveWebsiteTheme);
  const { data } = useQuery({
    queryKey: ["active-website-theme"],
    queryFn: () => fetchTheme(),
    staleTime: 60 * 1000,
  });
  const t = (data?.theme_json ?? null) as ThemeJson | null;
  const flat = (t?.theme ?? t) as ThemeJson | null;
  return flat?.logo_url || null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const fetchTheme = useServerFn(getActiveWebsiteTheme);
  const { data } = useQuery({
    queryKey: ["active-website-theme"],
    queryFn: () => fetchTheme(),
    staleTime: 60 * 1000,
  });

  const [isDark, setIsDark] = useState(false);

  // Sync initial dark-mode state on mount, and stay in sync when ThemeToggle changes it.
  useEffect(() => {
    setIsDark(readIsDark());
    const onDarkChange = () => setIsDark(readIsDark());
    window.addEventListener(DARK_MODE_EVENT, onDarkChange);
    const onStorage = (e: StorageEvent) => { if (e.key === DARK_STORAGE_KEY) onDarkChange(); };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(DARK_MODE_EVENT, onDarkChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    applyTheme((data?.theme_json ?? null) as ThemeJson | null, isDark);
  }, [data, isDark]);

  // Live preview bridge: parent posts { source:'zain-preview', kind:'theme'|'reload', json? }
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string; json?: unknown } | null;
      if (!d || d.source !== "zain-preview") return;
      if (d.kind === "theme") applyTheme(d.json as ThemeJson, readIsDark());
      else if (d.kind === "reload") window.location.reload();
    };
    window.addEventListener("message", onMsg);
    try { window.parent?.postMessage({ source: "zain-preview", kind: "ready" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return <>{children}</>;
}
