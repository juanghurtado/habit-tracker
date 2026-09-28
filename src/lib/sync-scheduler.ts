import { commit, getState } from "../lib/store.ts";
import { supabase } from "../lib/supabase.ts";
import { runSync } from "../lib/sync.ts";
import type { SyncStatus } from "../types.ts";

let syncStatus: SyncStatus = "idle";
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let syncing = false;
let requestedDuringFlight = false;
const statusListeners = new Set<() => void>();

function notifyStatusListeners(): void {
  for (const listener of statusListeners) {
    listener();
  }
}

export function setUserId(id: string | null): void {
  currentUserId = id;
}

export function subscribeSyncStatus(callback: () => void): () => void {
  statusListeners.add(callback);
  return () => statusListeners.delete(callback);
}

export function getSnapshotSyncStatus(): SyncStatus {
  return syncStatus;
}

async function doSync(): Promise<void> {
  if (!currentUserId) {
    return;
  }
  if (syncing) {
    // A write landed while a sync is running. Its push was skipped, so run
    // another sync as soon as this one finishes.
    requestedDuringFlight = true;
    return;
  }

  syncing = true;
  syncStatus = "syncing";
  notifyStatusListeners();

  try {
    const outcome = await runSync({
      store: { getState, commit },
      supabase,
      userId: currentUserId,
    });
    if (outcome.status === "failed") {
      // Quiet by design (ADR-0004: the app works fine while Supabase is
      // down) — the dirty records stay queued for the next natural trigger.
      console.warn(`[sync] run failed: ${outcome.reason}`);
    }
  } finally {
    syncing = false;
    syncStatus = "idle";
    notifyStatusListeners();
    if (requestedDuringFlight) {
      requestedDuringFlight = false;
      schedule();
    }
  }
}

export function schedule(): void {
  if (!currentUserId) {
    return;
  }
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  } else {
    syncStatus = "pending";
    notifyStatusListeners();
  }
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    doSync();
  }, 2000);
}

export function flush(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  doSync();
}

export function syncNow(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  doSync();
}

let initialized = false;

export function init(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      flush();
    }
  });
}

export function reset(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  syncStatus = "idle";
  syncing = false;
  requestedDuringFlight = false;
  currentUserId = null;
  statusListeners.clear();
  initialized = false;
}
