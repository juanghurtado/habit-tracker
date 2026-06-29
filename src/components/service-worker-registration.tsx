// biome-ignore lint/correctness/noUnresolvedImports: Vite virtual module resolved at build time
import { useRegisterSW } from "virtual:pwa-register/react";
import { useEffect, useRef } from "react";

export function ServiceWorkerRegistration() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    registerType: "autoUpdate",
    onRegistered(sw) {
      intervalRef.current = setInterval(
        () => {
          sw?.update();
        },
        60 * 60 * 1000
      );
    },
  });

  useEffect(() => {
    if (needRefresh[0]) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
