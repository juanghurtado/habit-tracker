/// <reference types="vite/client" />

// biome-ignore lint/correctness/noUnresolvedImports: Vite virtual module resolved at build time
declare module "virtual:pwa-register/react" {
  import type { Dispatch, SetStateAction } from "react";

  interface RegisterSWOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisterError?: (error: unknown) => void;
    onRegistered?: (sw: ServiceWorkerRegistration | undefined) => void;
    registerType?: "autoUpdate" | "prompt";
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => void;
  };
}

declare interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
}
