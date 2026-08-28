import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { trackAnalyticsEvent } from "@/lib/analytics.functions";

function getDeviceType(): "android" | "ios" | "desktop" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  if (/android/.test(ua)) {
    return "android";
  }

  if (/windows|macintosh|linux/.test(ua)) {
    return "desktop";
  }

  return "unknown";
}

function getVisitorId() {
  const key = "zain_analytics_visitor_id";

  let id = localStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }

  return id;
}

function getSessionId() {
  const key = "zain_analytics_session_id";

  let id = sessionStorage.getItem(key);

  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }

  return id;
}

function getTrafficSource() {
  const params = new URLSearchParams(window.location.search);

  const utmSource = params.get("utm_source");

  if (utmSource) {
    return utmSource.toLowerCase();
  }

  const referrer = document.referrer.toLowerCase();

  if (referrer.includes("instagram")) {
    return "instagram";
  }

  if (referrer.includes("google")) {
    return "google";
  }

  if (referrer.includes("whatsapp")) {
    return "whatsapp";
  }

  if (!referrer) {
    return "direct";
  }

  return "referral";
}

export function AnalyticsTracker() {
  const location = useLocation();
  const trackEvent = useServerFn(trackAnalyticsEvent);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visitorId = getVisitorId();
    const sessionId = getSessionId();

    trackEvent({
      data: {
        event_name: "page_view",
        visitor_id: visitorId,
        session_id: sessionId,
        page: location.pathname,
        device_type: getDeviceType(),
        source: getTrafficSource(),
        metadata: {
          title: document.title,
        },
      },
    }).catch((error) => {
      console.error("[analytics] page view failed:", error);
    });
  }, [location.pathname]);

  return null;
}
