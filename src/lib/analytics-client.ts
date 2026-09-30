// Browser-side analytics helpers, shared by the page-view tracker,
// the cart, checkout and the assistant.
import { trackAnalyticsEvent } from "./analytics.functions";

export type DeviceType = "android" | "ios" | "desktop" | "unknown";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|linux/.test(ua)) return "desktop";
  return "unknown";
}

export function getVisitorId(): string {
  const key = "zain_analytics_visitor_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function getSessionId(): string {
  const key = "zain_analytics_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function getTrafficSource(): string {
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) return utmSource.toLowerCase();

  const referrer = document.referrer.toLowerCase();
  if (referrer.includes("instagram")) return "instagram";
  if (referrer.includes("google")) return "google";
  if (referrer.includes("whatsapp")) return "whatsapp";
  if (!referrer) return "direct";
  return "referral";
}

/**
 * Fire-and-forget event. Never throws and never blocks the UI:
 * analytics must not be able to break shopping.
 */
export function trackClientEvent(
  eventName: string,
  extra: { product_id?: string | null; metadata?: Record<string, unknown> } = {},
) {
  if (typeof window === "undefined") return;
  try {
    const productId = extra.product_id && UUID_RE.test(extra.product_id) ? extra.product_id : null;
    void trackAnalyticsEvent({
      data: {
        event_name: eventName,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        page: window.location.pathname,
        product_id: productId,
        device_type: getDeviceType(),
        source: getTrafficSource(),
        metadata: extra.metadata ?? {},
      },
    }).catch((error) => {
      console.error(`[analytics] ${eventName} failed:`, error);
    });
  } catch (error) {
    console.error(`[analytics] ${eventName} failed:`, error);
  }
}
