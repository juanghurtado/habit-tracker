/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);

const navigationRoute = new NavigationRoute(async () => {
  const response = await fetch("/habit-tracker/index.html");
  if (response.ok) {
    return response;
  }
  const cache = await caches.open("workbox-precache");
  const cachedResponse = await cache.match("index.html");
  if (cachedResponse) {
    return cachedResponse;
  }
  return new Response("Offline", { status: 503 });
});

registerRoute(navigationRoute);

self.addEventListener("activate", () => {
  clientsClaim();
});
