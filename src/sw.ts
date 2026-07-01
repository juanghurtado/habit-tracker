/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();

precacheAndRoute(self.__WB_MANIFEST);

const handler = createHandlerBoundToURL("index.html");
registerRoute(new NavigationRoute(handler));

self.addEventListener("activate", () => {
  clientsClaim();
});
