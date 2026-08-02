// Empty service worker placeholder to satisfy browser cache checks
// and prevent 404 logs from previous localhost service worker registrations.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});
