import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import {
  createCompletion,
  createHabit,
  loadCompletions,
  loadHabits,
  saveCompletions,
  saveHabits,
} from "../lib/storage.ts";
import { supabase } from "../lib/supabase.ts";
import { syncAll } from "../lib/sync.ts";
import type { Completion, Habit } from "../types.ts";
import { useAuth } from "./use-auth.tsx";

let cachedHabits: Habit[] = loadHabits();
let cachedVisibleHabits: Habit[] = cachedHabits.filter(
  (h) => h.deletedAt === null
);
let cachedCompletions: Completion[] = loadCompletions();
let cachedVisibleCompletions: Completion[] = cachedCompletions.filter(
  (c) => c.deletedAt === null
);

const listeners = new Set<() => void>();

function notifyListeners() {
  cachedHabits = loadHabits();
  cachedVisibleHabits = cachedHabits.filter((h) => h.deletedAt === null);
  cachedCompletions = loadCompletions();
  cachedVisibleCompletions = cachedCompletions.filter(
    (c) => c.deletedAt === null
  );
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshotHabits(): Habit[] {
  return cachedVisibleHabits;
}

function getSnapshotCompletions(): Completion[] {
  return cachedVisibleCompletions;
}

export type SyncStatus = "idle" | "pending" | "syncing";

let syncStatus: SyncStatus = "idle";

const syncStatusListeners = new Set<() => void>();

function subscribeSyncStatus(callback: () => void): () => void {
  syncStatusListeners.add(callback);
  return () => syncStatusListeners.delete(callback);
}

function getSnapshotSyncStatus(): SyncStatus {
  return syncStatus;
}

function notifySyncStatus() {
  for (const listener of syncStatusListeners) {
    listener();
  }
}

export function useHabits() {
  const habits = useSyncExternalStore(subscribe, getSnapshotHabits);
  const completions = useSyncExternalStore(subscribe, getSnapshotCompletions);
  const status = useSyncExternalStore(
    subscribeSyncStatus,
    getSnapshotSyncStatus
  );
  const { user } = useAuth();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const doSync = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      return;
    }
    syncStatus = "syncing";
    notifySyncStatus();
    const currentHabits = loadHabits();
    const currentCompletions = loadCompletions();
    try {
      const result = await syncAll({
        habits: currentHabits,
        completions: currentCompletions,
        supabase,
        userId: currentUser.id,
      });
      saveHabits(result.habits);
      saveCompletions(result.completions);
      notifyListeners();
    } finally {
      syncStatus = "idle";
      notifySyncStatus();
    }
  }, []);

  const scheduleSync = useCallback(() => {
    if (!userRef.current) {
      return;
    }
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    } else {
      syncStatus = "pending";
      notifySyncStatus();
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      doSync();
    }, 2000);
  }, [doSync]);

  const flushSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
      doSync();
    }
  }, [doSync]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        flushSync();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [flushSync]);

  const addHabit = useCallback(
    (
      name: string,
      icon: string,
      type: "good" | "bad",
      color: string,
      buttonLabel: string
    ) => {
      const updated = [
        ...loadHabits(),
        createHabit(name, icon, type, color, buttonLabel),
      ];
      saveHabits(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const editHabit = useCallback(
    (
      id: string,
      name: string,
      icon: string,
      type: "good" | "bad",
      color: string,
      buttonLabel: string
    ) => {
      const now = new Date().toISOString();
      const updated = loadHabits().map((h) =>
        h.id === id
          ? {
              ...h,
              name,
              icon,
              type,
              color,
              buttonLabel,
              updatedAt: now,
              syncedAt: null,
            }
          : h
      );
      saveHabits(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      const updated = loadHabits().map((h) =>
        h.id === id
          ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null }
          : h
      );
      saveHabits(updated);
      const comps = loadCompletions().filter((c) => c.habitId !== id);
      saveCompletions(comps);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const addCompletion = useCallback(
    (habitId: string, date?: Date) => {
      const updated = [...loadCompletions(), createCompletion(habitId, date)];
      saveCompletions(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const undoLastCompletion = useCallback(
    (habitId: string) => {
      const comps = loadCompletions();
      const habitComps = comps.filter(
        (c) => c.habitId === habitId && c.deletedAt === null
      );
      if (habitComps.length === 0) {
        return;
      }
      const now = new Date().toISOString();
      const targetId = habitComps.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b
      ).id;
      const updated = comps.map((c) =>
        c.id === targetId ? { ...c, deletedAt: now, syncedAt: null } : c
      );
      saveCompletions(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const syncNow = useCallback(() => {
    doSync();
  }, [doSync]);

  return {
    habits,
    completions,
    addHabit,
    editHabit,
    deleteHabit,
    addCompletion,
    undoLastCompletion,
    syncStatus: status,
    syncNow,
  };
}
