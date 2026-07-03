import type { SupabaseClient } from "@supabase/supabase-js";
import type { Completion, Habit } from "../types.ts";

export function mergeHabits(local: Habit[], remote: Habit[]): Habit[] {
  const remoteMap = new Map(remote.map((h) => [h.id, h]));
  const seenIds = new Set<string>();
  const merged: Habit[] = [];

  for (const localHabit of local) {
    const remoteHabit = remoteMap.get(localHabit.id);
    let winner: Habit;
    if (!remoteHabit) {
      winner = localHabit;
    } else if (localHabit.updatedAt >= remoteHabit.updatedAt) {
      winner = localHabit;
    } else {
      winner = remoteHabit;
    }
    seenIds.add(winner.id);
    if (winner.deletedAt === null) {
      merged.push(winner);
    }
  }

  for (const remoteHabit of remote) {
    if (!seenIds.has(remoteHabit.id) && remoteHabit.deletedAt === null) {
      merged.push(remoteHabit);
    }
  }

  return merged;
}

export function mergeCompletions(
  local: Completion[],
  remote: Completion[]
): Completion[] {
  const localIds = new Set(local.map((c) => c.id));
  const merged = [...local];
  for (const remoteCompletion of remote) {
    if (
      !localIds.has(remoteCompletion.id) &&
      remoteCompletion.deletedAt === null
    ) {
      merged.push(remoteCompletion);
    }
  }
  return merged;
}

export function validateHabitRecord(r: Record<string, unknown>): asserts r is {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: "good" | "bad";
  color: string;
  button_label: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  deleted_at: string | null;
} {
  const requiredStringFields: Array<keyof typeof r> = [
    "id",
    "user_id",
    "name",
    "icon",
    "color",
    "button_label",
    "created_at",
    "updated_at",
  ];
  for (const field of requiredStringFields) {
    if (typeof r[field] !== "string") {
      throw new Error(
        `Invalid habit record: field "${String(field)}" is not a string (got ${typeof r[field]})`
      );
    }
  }
  if (r.type !== "good" && r.type !== "bad") {
    throw new Error(
      `Invalid habit record: field "type" must be "good" or "bad" (got ${String(r.type)})`
    );
  }
  const nullableFields: Array<keyof typeof r> = ["synced_at", "deleted_at"];
  for (const field of nullableFields) {
    const val = r[field];
    if (val !== null && val !== undefined && typeof val !== "string") {
      throw new Error(
        `Invalid habit record: field "${String(field)}" must be string or null (got ${typeof val})`
      );
    }
  }
}

export function validateCompletionRecord(
  r: Record<string, unknown>
): asserts r is {
  id: string;
  user_id: string;
  habit_id: string;
  timestamp: string;
  synced_at: string | null;
  deleted_at: string | null;
} {
  const requiredStringFields: Array<keyof typeof r> = [
    "id",
    "user_id",
    "habit_id",
    "timestamp",
  ];
  for (const field of requiredStringFields) {
    if (typeof r[field] !== "string") {
      throw new Error(
        `Invalid completion record: field "${String(field)}" is not a string (got ${typeof r[field]})`
      );
    }
  }
  const nullableFields: Array<keyof typeof r> = ["synced_at", "deleted_at"];
  for (const field of nullableFields) {
    const val = r[field];
    if (val !== null && val !== undefined && typeof val !== "string") {
      throw new Error(
        `Invalid completion record: field "${String(field)}" must be string or null (got ${typeof val})`
      );
    }
  }
}

export async function syncAll(options: {
  habits: Habit[];
  completions: Completion[];
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ habits: Habit[]; completions: Completion[] }> {
  const { habits, completions, supabase, userId } = options;
  const now = new Date().toISOString();

  const habitsToPush = habits.filter((h) => h.syncedAt === null);
  const failedHabitIds = new Set<string>();
  for (const habit of habitsToPush) {
    const { error } = await supabase.from("habits").upsert({
      id: habit.id,
      user_id: userId,
      name: habit.name,
      icon: habit.icon,
      type: habit.type,
      color: habit.color,
      button_label: habit.buttonLabel,
      created_at: habit.createdAt,
      synced_at: now,
      updated_at: habit.updatedAt,
      deleted_at: habit.deletedAt,
    });
    if (error) {
      failedHabitIds.add(habit.id);
    }
  }

  const completionsToPush = completions.filter((c) => c.syncedAt === null);
  const failedCompletionIds = new Set<string>();
  for (const completion of completionsToPush) {
    const { error } = await supabase.from("completions").upsert({
      id: completion.id,
      user_id: userId,
      habit_id: completion.habitId,
      timestamp: completion.timestamp,
      synced_at: now,
      deleted_at: completion.deletedAt,
    });
    if (error) {
      failedCompletionIds.add(completion.id);
    }
  }

  const syncedHabits = habits.map((h) =>
    h.syncedAt === null && !failedHabitIds.has(h.id)
      ? { ...h, syncedAt: now }
      : h
  );
  const syncedCompletions = completions.map((c) =>
    c.syncedAt === null && !failedCompletionIds.has(c.id)
      ? { ...c, syncedAt: now }
      : c
  );

  const { data: remoteHabits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId);

  const { data: remoteCompletions } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", userId);

  const mappedRemoteHabits: Habit[] = (remoteHabits ?? []).map((r) => {
    validateHabitRecord(r);
    return {
      id: r.id,
      name: r.name,
      icon: r.icon,
      type: r.type,
      color: r.color,
      buttonLabel: r.button_label,
      createdAt: r.created_at,
      syncedAt: r.synced_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    };
  });

  const mappedRemoteCompletions: Completion[] = (remoteCompletions ?? []).map(
    (r) => {
      validateCompletionRecord(r);
      return {
        id: r.id,
        habitId: r.habit_id,
        timestamp: r.timestamp,
        syncedAt: r.synced_at,
        deletedAt: r.deleted_at,
      };
    }
  );

  return {
    habits: mergeHabits(syncedHabits, mappedRemoteHabits),
    completions: mergeCompletions(syncedCompletions, mappedRemoteCompletions),
  };
}
