import type { SupabaseClient } from "@supabase/supabase-js";
import type { Completion, Habit } from "../types.ts";

export function mergeHabits(local: Habit[], remote: Habit[]): Habit[] {
  const localMap = new Map(local.map((h) => [h.id, h]));
  const seenIds = new Set<string>();
  const merged: Habit[] = [];

  for (const remoteHabit of remote) {
    const localHabit = localMap.get(remoteHabit.id);
    let winner: Habit;
    if (!localHabit) {
      winner = remoteHabit;
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

  for (const localHabit of local) {
    if (!seenIds.has(localHabit.id) && localHabit.deletedAt === null) {
      merged.push(localHabit);
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

export async function syncAll(options: {
  habits: Habit[];
  completions: Completion[];
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ habits: Habit[]; completions: Completion[] }> {
  const { habits, completions, supabase, userId } = options;
  const now = new Date().toISOString();

  const habitsToPush = habits.filter((h) => h.syncedAt === null);
  for (const habit of habitsToPush) {
    await supabase.from("habits").upsert({
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
  }

  const completionsToPush = completions.filter((c) => c.syncedAt === null);
  for (const completion of completionsToPush) {
    await supabase.from("completions").upsert({
      id: completion.id,
      user_id: userId,
      habit_id: completion.habitId,
      timestamp: completion.timestamp,
      synced_at: now,
      deleted_at: completion.deletedAt,
    });
  }

  const syncedHabits = habits.map((h) =>
    h.syncedAt === null ? { ...h, syncedAt: now } : h
  );
  const syncedCompletions = completions.map((c) =>
    c.syncedAt === null ? { ...c, syncedAt: now } : c
  );

  const { data: remoteHabits } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId);

  const { data: remoteCompletions } = await supabase
    .from("completions")
    .select("*")
    .eq("user_id", userId);

  const mappedRemoteHabits: Habit[] = (remoteHabits ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      icon: r.icon as string,
      type: r.type as "good" | "bad",
      color: r.color as string,
      buttonLabel: r.button_label as string,
      createdAt: r.created_at as string,
      syncedAt: (r.synced_at as string | null) ?? null,
      updatedAt: r.updated_at as string,
      deletedAt: (r.deleted_at as string | null) ?? null,
    })
  );

  const mappedRemoteCompletions: Completion[] = (remoteCompletions ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      habitId: r.habit_id as string,
      timestamp: r.timestamp as string,
      syncedAt: (r.synced_at as string | null) ?? null,
      deletedAt: (r.deleted_at as string | null) ?? null,
    })
  );

  return {
    habits: mergeHabits(syncedHabits, mappedRemoteHabits),
    completions: mergeCompletions(syncedCompletions, mappedRemoteCompletions),
  };
}
