import { commit, getState } from "../lib/store.ts";
import { supabase } from "../lib/supabase.ts";
import { syncAll } from "../lib/sync.ts";
import type { SyncStatus } from "../types.ts";

let syncStatus: SyncStatus = "idle";
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
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

  syncStatus = "syncing";
  notifyStatusListeners();

  const { habits, completions } = getState();

  try {
    const result = await syncAll({
      habits,
      completions,
      supabase,
      userId: currentUserId,
    });
    commit(result);
  } finally {
    syncStatus = "idle";
    notifyStatusListeners();
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
  currentUserId = null;
  statusListeners.clear();
  initialized = false;
}
