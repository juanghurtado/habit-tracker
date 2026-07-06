import { createCompletion, createHabit } from "../lib/storage.ts";
import type { StoreState, Transforms } from "../lib/store.ts";
import { commit, getState } from "../lib/store.ts";
import { schedule } from "../lib/sync-scheduler.ts";

function commitAndSync(
  transform: (state: StoreState) => Transforms | undefined
): void {
  const transforms = transform(getState());
  if (!transforms) {
    return;
  }
  commit(transforms);
  schedule();
}

export function addHabit(
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): void {
  commitAndSync(({ habits }) => ({
    habits: [...habits, createHabit(name, icon, type, color, buttonLabel)],
  }));
}

export function editHabit(
  id: string,
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): void {
  const now = new Date().toISOString();
  commitAndSync(({ habits }) => ({
    habits: habits.map((h) =>
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
    ),
  }));
}

export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  commitAndSync(({ habits, completions }) => ({
    habits: habits.map((h) =>
      h.id === id ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null } : h
    ),
    completions: completions.map((c) =>
      c.habitId === id ? { ...c, deletedAt: now, syncedAt: null } : c
    ),
  }));
}

export function addCompletion(habitId: string, date?: Date): void {
  commitAndSync(({ completions }) => ({
    completions: [...completions, createCompletion(habitId, date)],
  }));
}

export function undoLastCompletion(habitId: string): void {
  commitAndSync(({ completions }) => {
    const habitComps = completions.filter(
      (c) => c.habitId === habitId && c.deletedAt === null
    );
    if (habitComps.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const targetId = habitComps.reduce((a, b) =>
      a.timestamp > b.timestamp ? a : b
    ).id;
    return {
      completions: completions.map((c) =>
        c.id === targetId ? { ...c, deletedAt: now, syncedAt: null } : c
      ),
    };
  });
}
