import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { trackAnalyticsEvent } from "@/lib/analytics.functions";
import {
  getDeviceType,
  getSessionId,
  getTrafficSource,
  getVisitorId,
} from "@/lib/analytics-client";

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
