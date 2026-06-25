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
let cachedCompletions: Completion[] = loadCompletions();

const listeners = new Set<() => void>();

function notifyListeners() {
  cachedHabits = loadHabits();
  cachedCompletions = loadCompletions();
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshotHabits(): Habit[] {
  return cachedHabits;
}

function getSnapshotCompletions(): Completion[] {
  return cachedCompletions;
}

export function useHabits() {
  const habits = useSyncExternalStore(subscribe, getSnapshotHabits);
  const completions = useSyncExternalStore(subscribe, getSnapshotCompletions);
  const { user } = useAuth();
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  const doSync = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) {
      return;
    }
    const currentHabits = loadHabits();
    const currentCompletions = loadCompletions();
    const result = await syncAll({
      habits: currentHabits,
      completions: currentCompletions,
      supabase,
      userId: currentUser.id,
    });
    saveHabits(result.habits);
    saveCompletions(result.completions);
    notifyListeners();
  }, []);

  const scheduleSync = useCallback(() => {
    if (!userRef.current) {
      return;
    }
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(doSync, 2000);
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
      const updated = loadHabits().map((h) =>
        h.id === id ? { ...h, name, icon, type, color, buttonLabel } : h
      );
      saveHabits(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  const deleteHabit = useCallback(
    (id: string) => {
      const updated = loadHabits().filter((h) => h.id !== id);
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
      const habitComps = comps.filter((c) => c.habitId === habitId);
      if (habitComps.length === 0) {
        return;
      }
      const mostRecent = habitComps.reduce((a, b) =>
        a.timestamp > b.timestamp ? a : b
      );
      const updated = comps.filter((c) => c.id !== mostRecent.id);
      saveCompletions(updated);
      notifyListeners();
      scheduleSync();
    },
    [scheduleSync]
  );

  return {
    habits,
    completions,
    addHabit,
    editHabit,
    deleteHabit,
    addCompletion,
    undoLastCompletion,
  };
}
