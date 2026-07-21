import { useEffect, useRef, useState } from "react";
import { RefreshCw, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";

type Device = "mobile" | "tablet" | "desktop";
const WIDTHS: Record<Device, number> = { mobile: 390, tablet: 768, desktop: 1200 };

export type LivePayload =
  | { kind: "theme"; json: unknown }
  | { kind: "reload" }
  | null;

/**
 * Split-view iframe that previews the live site.
 * When `payload` changes, we postMessage it into the iframe (ThemeProvider listens).
 * For non-live kinds (layouts/pages/etc.) call `reloadOnSave` after persisting.
 */
export function LivePreview({
  path = "/",
  payload = null,
  title = "معاينة مباشرة",
}: {
  path?: string;
  payload?: LivePayload;
  title?: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [url, setUrl] = useState(path);

  // Listen for the iframe's "ready" ping
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { source?: string; kind?: string } | null;
      if (d?.source === "zain-preview" && d.kind === "ready") setReady(true);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Push payload on change (debounced)
  useEffect(() => {
    if (!ready || !payload) return;
    const t = setTimeout(() => {
      ref.current?.contentWindow?.postMessage({ source: "zain-preview", ...payload }, "*");
    }, 150);
    return () => clearTimeout(t);
  }, [payload, ready]);

  const reload = () => {
    setReady(false);
    if (ref.current) ref.current.src = ref.current.src;
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)] flex-wrap">
        <span className="text-xs font-bold">{title}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded ${ready ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"}`}>
          {ready ? "متصل" : "جارٍ التحميل"}
        </span>
        <div className="mx-auto flex gap-1">
          {(["mobile", "tablet", "desktop"] as Device[]).map((d) => {
            const Icon = d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
            return (
              <button key={d} onClick={() => setDevice(d)}
                className={`p-1.5 rounded ${device === d ? "bg-[var(--color-gold)] text-[var(--color-ink)]" : "hover:bg-[var(--color-bg)]"}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
        <input value={url} onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") reload(); }}
          className="flex-1 min-w-[120px] px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-xs" dir="ltr" />
        <button onClick={reload} className="p-1.5 rounded hover:bg-[var(--color-bg)]" title="إعادة التحميل">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <a href={url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-[var(--color-bg)]" title="فتح في تبويب">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="flex-1 bg-black/5 overflow-auto flex justify-center p-2">
        <iframe
          ref={ref}
          src={url}
          title="live-preview"
          style={{ width: WIDTHS[device], height: "100%", minHeight: 600, background: "white" }}
          className="rounded shadow-sm border border-[var(--color-border)]"
        />
      </div>
    </div>
  );
}
