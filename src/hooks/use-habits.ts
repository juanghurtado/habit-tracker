import { useEffect, useSyncExternalStore } from "react";
import {
  addCompletion,
  addHabit,
  deleteHabit,
  editHabit,
  undoLastCompletion,
} from "../lib/crud.ts";
import { useStore } from "../lib/store.ts";
import {
  getSnapshotSyncStatus,
  init,
  setUserId,
  subscribeSyncStatus,
  syncNow,
} from "../lib/sync-scheduler.ts";
import { useAuth } from "./use-auth.tsx";

export type { SyncStatus } from "../types.ts";

export function useHabits() {
  const { habits, completions } = useStore();
  const syncStatus = useSyncExternalStore(
    subscribeSyncStatus,
    getSnapshotSyncStatus
  );
  const { user } = useAuth();

  useEffect(() => {
    init();
    setUserId(user?.id ?? null);
  }, [user]);

  return {
    habits,
    completions,
    addHabit,
    editHabit,
    deleteHabit,
    addCompletion,
    undoLastCompletion,
    syncStatus,
    syncNow,
  };
}
