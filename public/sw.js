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
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:
        self.location.origin +
        "/__l5e/assets-v1/8a480b10-0c8e-47b8-b89b-bde1e2cd54c8/zain-logo.png",
      badge:
        self.location.origin +
        "/__l5e/assets-v1/8a480b10-0c8e-47b8-b89b-bde1e2cd54c8/zain-logo.png",
      dir: "rtl",
      lang: "ar",
      tag: payload.ref_id || undefined,
      data: { url: "/admin", type: payload.type || null, ref_id: payload.ref_id || null },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/admin") && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
