import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, Loader2 } from "lucide-react";
import {
  listNotifications, markNotificationsRead, getPushPublicKey, subscribePush,
} from "@/lib/notifications.functions";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string;
  ref_id: string | null;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `قبل ${d} يوم`;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationBell({ token }: { token: string }) {
  const list = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const pubKey = useServerFn(getPushPublicKey);
  const subscribe = useServerFn(subscribePush);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await list({ data: { password: token } });
      setItems(r.items as Item[]);
      setUnread(r.unread);
    } catch { /* تجاهل أخطاء التحديث الدوري */ }
  }, [list, token]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // حالة اشتراك الإشعارات بالمتصفح
  useEffect(() => {
    (async () => {
      if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushOn(true); // غير مدعوم — لا نعرض الزر
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushOn(!!sub);
      } catch { setPushOn(true); }
    })();
  }, []);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        setUnread(0);
        setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
        try { await markRead({ data: { password: token, id: null } }); } catch { /* تجاهل */ }
      }
    }
  };

  const enablePush = async () => {
    setPushBusy(true); setPushErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("تم رفض إذن الإشعارات من المتصفح");
      const { publicKey } = await pubKey({});
      if (!publicKey) throw new Error("مفتاح الإشعارات غير مُهيأ على الخادم");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("تعذّر قراءة بيانات الاشتراك");
      await subscribe({ data: { password: token, endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } });
      setPushOn(true);
    } catch (e) {
      setPushErr(e instanceof Error ? e.message : "تعذّر تفعيل الإشعارات");
    } finally { setPushBusy(false); }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={toggle} className="btn-outline relative" aria-label="الإشعارات">
        {unread > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        <span className="hidden sm:inline">الإشعارات</span>
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-hairline)] text-sm font-bold">الإشعارات</div>

          {pushOn === false && (
            <div className="p-3 border-b border-[var(--color-hairline)]">
              <button onClick={enablePush} disabled={pushBusy} className="btn-gold w-full text-sm">
                {pushBusy && <Loader2 className="w-4 h-4 animate-spin" />} تفعيل إشعارات المتصفح
              </button>
              {pushErr && <p className="text-xs text-red-600 mt-2">{pushErr}</p>}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-[var(--color-ink-soft)]">لا توجد إشعارات</div>
            ) : (
              items.map((n) => (
                <div key={n.id} className="px-3 py-2 border-b border-[var(--color-hairline)] last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm">{n.title}</div>
                    <div className="text-[11px] text-[var(--color-ink-soft)] whitespace-nowrap">{timeAgo(n.created_at)}</div>
                  </div>
                  <div className="text-xs text-[var(--color-ink-soft)] mt-0.5">{n.body}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
