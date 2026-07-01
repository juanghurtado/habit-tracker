import { createCompletion, createHabit } from "../lib/storage.ts";
import { commit, getState } from "../lib/store.ts";
import { schedule } from "../lib/sync-scheduler.ts";

export function addHabit(
  name: string,
  icon: string,
  type: "good" | "bad",
  color: string,
  buttonLabel: string
): void {
  const { habits } = getState();
  const updated = [
    ...habits,
    createHabit(name, icon, type, color, buttonLabel),
  ];
  commit({ habits: updated });
  schedule();
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
  const { habits } = getState();
  const updated = habits.map((h) =>
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
  commit({ habits: updated });
  schedule();
}

export function deleteHabit(id: string): void {
  const now = new Date().toISOString();
  const { habits, completions } = getState();
  const updatedHabits = habits.map((h) =>
    h.id === id ? { ...h, deletedAt: now, updatedAt: now, syncedAt: null } : h
  );
  const updatedCompletions = completions.filter((c) => c.habitId !== id);
  commit({ habits: updatedHabits, completions: updatedCompletions });
  schedule();
}

export function addCompletion(habitId: string, date?: Date): void {
  const { completions } = getState();
  const updated = [...completions, createCompletion(habitId, date)];
  commit({ completions: updated });
  schedule();
}

export function undoLastCompletion(habitId: string): void {
  const { completions } = getState();
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
  const updated = completions.map((c) =>
    c.id === targetId ? { ...c, deletedAt: now, syncedAt: null } : c
  );
  commit({ completions: updated });
  schedule();
}
