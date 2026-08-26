import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, X, Loader2 } from "lucide-react";
import { getPushPublicKey, subscribeCustomerPush } from "@/lib/notifications.functions";

const DISMISS_KEY = "zain_push_prompt_dismissed";

// Routes where this is staff/admin-facing, not a customer — never prompt there.
const EXCLUDED_PREFIXES = ["/admin", "/warranty/admin", "/warranty/branch", "/warranty/auth"];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function detectDeviceType(): "android" | "ios" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/Mobi/i.test(ua)) return "unknown";
  return "desktop";
}

export function PushSubscribePrompt() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const pubKey = useServerFn(getPushPublicKey);
  const subscribe = useServerFn(subscribeCustomerPush);

  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) {
      setVisible(false);
      return;
    }
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    // تأخير بسيط عشان ما نزعج الزائر أول ما تفتح الصفحة
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [path]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        // احترام قرار الزائر — ما نعاود نزعجه بنفس الجلسة
        dismiss();
        return;
      }
      const { publicKey } = await pubKey({});
      if (!publicKey) throw new Error("الإشعارات غير مُفعّلة حالياً");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("تعذّر قراءة بيانات الاشتراك");
      }
      await subscribe({
        data: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          device_type: detectDeviceType(),
        },
      });
      localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر تفعيل الإشعارات");
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 inset-x-4 md:inset-x-auto md:left-6 md:max-w-sm z-40">
      <div className="card-clean p-4 shadow-xl flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[var(--color-gold-soft)] flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-[var(--color-gold)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">فعّل إشعارات زين 🔔</div>
          <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">
            عشان توصلك أحدث العروض والمنتجات أول بأول
          </p>
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={enable} disabled={busy} className="btn-gold text-xs flex-1">
              {busy && <Loader2 className="w-3 h-3 animate-spin" />} تفعيل
            </button>
            <button onClick={dismiss} className="btn-outline text-xs">
              لاحقاً
            </button>
          </div>
        </div>
        <button onClick={dismiss} aria-label="إغلاق" className="p-1 text-[var(--color-ink-soft)]">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
