// Service worker بسيط — مطلوب فقط عشان المتصفح يسمح بتثبيت الموقع كتطبيق (PWA).
// ما يخزن أي شي أوفلاين حالياً، بس يمرر الطلبات عادي عشان الموقع يشتغل زي ما هو دايماً.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

// ===== إشعارات المتصفح (Web Push) =====
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: "إشعار جديد", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "إشعار جديد";
  const body = payload.body || "";
  const icon =
    self.location.origin + "/__l5e/assets-v1/8a480b10-0c8e-47b8-b89b-bde1e2cd54c8/zain-logo.png";

  const isCampaign = payload.type === "campaign";
  const options = {
    body,
    icon,
    badge: icon,
    dir: "rtl",
    lang: "ar",
    tag: payload.ref_id || payload.campaign_id || undefined,
    data: {
      // إشعارات الأدمن (طلب جديد، ضمان اتفعّل...) تفتح لوحة التحكم كالمعتاد.
      // إشعارات حملات العملاء تفتح الرابط المحدد بالحملة، أو الرئيسية إن ما فيه رابط.
      url: isCampaign ? payload.link_url || "/" : "/admin",
      type: payload.type || null,
      ref_id: payload.ref_id || null,
      campaign_id: payload.campaign_id || null,
    },
  };
  // "image" يعرض صورة كبيرة داخل الإشعار — مدعومة على Android/Chrome بس، تُتجاهل بصمت بالمنصات الثانية.
  if (isCampaign && payload.image_url) options.image = payload.image_url;

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/admin";
  const isAdminAlert = data.type && data.type !== "campaign";

  event.waitUntil(
    (async () => {
      if (data.campaign_id) {
        try {
          await fetch("/api/track-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaign_id: data.campaign_id }),
          });
        } catch (e) {
          // تجاهل فشل تتبع النقرة — ما نمنع فتح الرابط بسببه
        }
      }
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (isAdminAlert) {
        for (const client of list) {
          if (client.url.includes("/admin") && "focus" in client) return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
