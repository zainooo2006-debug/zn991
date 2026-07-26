// Service worker بسيط — مطلوب فقط عشان المتصفح يسمح بتثبيت الموقع كتطبيق (PWA).
// ما يخزن أي شي أوفلاين حالياً، بس يمرر الطلبات عادي عشان الموقع يشتغل زي ما هو دايماً.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
