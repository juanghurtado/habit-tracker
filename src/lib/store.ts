import { useSyncExternalStore } from "react";
import {
  loadCompletions,
  loadHabits,
  saveCompletions,
  saveHabits,
} from "../lib/storage.ts";
import type { Completion, Habit } from "../types.ts";

interface StoreState {
  completions: Completion[];
  habits: Habit[];
}

let state: StoreState = {
  habits: loadHabits(),
  completions: loadCompletions(),
};

let cachedVisibleHabits: Habit[] = state.habits.filter(
  (h) => h.deletedAt === null
);
let cachedVisibleCompletions: Completion[] = state.completions.filter(
  (c) => c.deletedAt === null
);

const listeners = new Set<() => void>();

function updateCaches() {
  cachedVisibleHabits = state.habits.filter((h) => h.deletedAt === null);
  cachedVisibleCompletions = state.completions.filter(
    (c) => c.deletedAt === null
  );
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

export function getState(): StoreState {
  return state;
}

export function commit(transforms: {
  habits?: Habit[];
  completions?: Completion[];
}): void {
  if (transforms.habits !== undefined) {
    state.habits = transforms.habits;
  }
  if (transforms.completions !== undefined) {
    state.completions = transforms.completions;
  }
  updateCaches();
  saveHabits(state.habits);
  saveCompletions(state.completions);
  notify();
}

export function rehydrate(): void {
  state = {
    habits: loadHabits(),
    completions: loadCompletions(),
  };
  updateCaches();
  notify();
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshotHabits(): Habit[] {
  return cachedVisibleHabits;
}

function getSnapshotCompletions(): Completion[] {
  return cachedVisibleCompletions;
}

export function useStore(): { habits: Habit[]; completions: Completion[] } {
  const habits = useSyncExternalStore(subscribe, getSnapshotHabits);
  const completions = useSyncExternalStore(subscribe, getSnapshotCompletions);
  return { habits, completions };
}

export function reset(): void {
  state = { habits: [], completions: [] };
  cachedVisibleHabits = [];
  cachedVisibleCompletions = [];
  localStorage.removeItem("habit-tracker-habits");
  localStorage.removeItem("habit-tracker-completions");
  listeners.clear();
}
