import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreState, Transforms } from "../lib/store.ts";
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

/**
 * Marks records that were part of this sync's push batch as synced.
 *
 * Only records that are still the exact object we pushed are marked: an
 * identity check, because a local edit while the sync was in flight replaces
 * the object. Edited or newly added records stay dirty (`syncedAt === null`)
 * and are pushed by the next sync.
 */
function markSynced<T extends { id: string; syncedAt: string | null }>(
  latest: T[],
  snapshot: T[],
  failedIds: Set<string>,
  now: string
): T[] {
  const snapshotById = new Map(snapshot.map((record) => [record.id, record]));
  return latest.map((record) => {
    const pushed = snapshotById.get(record.id);
    if (
      record !== pushed ||
      pushed?.syncedAt !== null ||
      failedIds.has(record.id)
    ) {
      return record;
    }
    return { ...record, syncedAt: now };
  });
}

/** The slice of the store the Sync module reads from and writes to. */
export interface SyncStore {
  commit: (transforms: Transforms) => void;
  getState: () => StoreState;
}

/**
 * Why a run failed.
 *
 * - `network` — the remote copy could not be read, so nothing was reconciled.
 * - `invalid-remote` — a remote row failed validation, so nothing was committed.
 * - `push-rejected` — some local records were refused on upload; the
 *   reconciliation itself completed and was committed.
 */
export type SyncFailureReason = "network" | "invalid-remote" | "push-rejected";

/** What one Sync run reports back. See CONTEXT.md, "Sync Outcome". */
export type SyncOutcome =
  | { status: "ok" }
  | { status: "failed"; reason: SyncFailureReason };

/**
 * One reconciliation run against Supabase.
 *
 * Reads the store after every await, so local edits made while the run is in
 * flight win over the snapshot it pushed from; commits the merged result
 * itself; and never throws past this interface. Callers must not run it
 * concurrently — serialization belongs to the scheduler.
 */
export async function runSync(options: {
  store: SyncStore;
  supabase: SupabaseClient;
  userId: string;
}): Promise<SyncOutcome> {
  const { store, supabase, userId } = options;
  // Destructure now: getState() hands back the live state object, so both
  // arrays must be captured before the awaits — reading them off the object
  // later would return the post-edit arrays.
  const { habits: snapshotHabits, completions: snapshotCompletions } =
    store.getState();
  const now = new Date().toISOString();

  // Reason reported if the phase currently running throws. Phases overwrite it.
  let phase: SyncFailureReason = "network";
  let pushRejected = false;

  try {
    const failedHabitIds = new Set<string>();
    for (const habit of snapshotHabits) {
      if (habit.syncedAt !== null) {
        continue;
      }
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
        pushRejected = true;
      }
    }

    const failedCompletionIds = new Set<string>();
    for (const completion of snapshotCompletions) {
      if (completion.syncedAt !== null) {
        continue;
      }
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
        pushRejected = true;
      }
    }

    const { data: remoteHabits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId);
    const { data: remoteCompletions, error: completionsError } = await supabase
      .from("completions")
      .select("*")
      .eq("user_id", userId);
    if (habitsError || completionsError) {
      return { status: "failed", reason: "network" };
    }

    phase = "invalid-remote";
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

    // Read the store only now, after every await: edits made while this run
    // was in flight are local truth and must win over the snapshot pushed
    // from, while the remote copy wins for records untouched locally.
    const latest = store.getState();
    store.commit({
      habits: mergeHabits(
        markSynced(latest.habits, snapshotHabits, failedHabitIds, now),
        mappedRemoteHabits
      ),
      completions: mergeCompletions(
        markSynced(
          latest.completions,
          snapshotCompletions,
          failedCompletionIds,
          now
        ),
        mappedRemoteCompletions
      ),
    });

    if (pushRejected) {
      return { status: "failed", reason: "push-rejected" };
    }
    return { status: "ok" };
  } catch {
    return { status: "failed", reason: phase };
  }
}
