# Plan 003: Add remote data validation in sync.ts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `advisor-plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cb4580b..HEAD -- src/lib/sync.ts src/lib/sync.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `cb4580b`, 2026-07-03
- **Issue**: —

## Why this matters

`sync.ts:118-141` maps raw Supabase responses (`Record<string, unknown>`) to typed `Habit` and `Completion` objects using unchecked `as string` casts. While Supabase Row Level Security (RLS) ensures users can only read their own rows (`docs/supabase-schema.sql:27-31`), a compromised database, a misconfigured RLS policy, or a future RLS change could return malformed data. The `as string` casts silently accept any value — a `null` id, a number `type`, or a missing `timestamp` would all pass through without error, potentially causing crashes or data corruption downstream. Adding a lightweight validation function prevents this at the boundary.

## Current state

### File: `src/lib/sync.ts`

Lines 118-131 — mapping remote habits:

```tsx
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
```

Lines 133-141 — mapping remote completions:

```tsx
const mappedRemoteCompletions: Completion[] = (remoteCompletions ?? []).map(
  (r: Record<string, unknown>) => ({
    id: r.id as string,
    habitId: r.habit_id as string,
    timestamp: r.timestamp as string,
    syncedAt: (r.synced_at as string | null) ?? null,
    deletedAt: (r.deleted_at as string | null) ?? null,
  })
);
```

### File: `src/types.ts`

The target types:

```tsx
export interface Habit {
  buttonLabel: string;
  color: string;
  createdAt: string;
  deletedAt: string | null;
  icon: string;
  id: string;
  name: string;
  syncedAt: string | null;
  type: HabitType;
  updatedAt: string;
}

export type HabitType = "good" | "bad";

export interface Completion {
  deletedAt: string | null;
  habitId: string;
  id: string;
  syncedAt: string | null;
  timestamp: string;
}
```

### Convention to match

- The repo uses `Error` objects with descriptive messages (AGENTS.md line 81).
- The repo uses `for...of` loops over `.forEach()`.
- Tests use `vi.fn()` for mocking and `expect(...).toHaveBeenCalledWith()` for assertions.
- Error handling in `sync.test.ts:312-332` already tests error paths — follow this pattern.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc -b` | exit 0, no errors |
| Tests | `npm test` | all tests pass |
| Lint | `npm exec -- ultracite check` | exit 0, no issues |

## Scope

**In scope** (the only files you should modify):
- `src/lib/sync.ts` — add validation functions and use them in mapping
- `src/lib/sync.test.ts` — add validation tests

**Out of scope** (do NOT touch):
- `src/lib/supabase.ts` — Supabase client initialization
- `src/lib/store.ts` — store layer
- `src/lib/storage.ts` — localStorage layer
- Any other files

## Git workflow

- Branch: `advisor/003-remote-data-validation`
- Commit message style: conventional commits (example: `fix: validate remote data in sync before mapping to types`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add validation functions to `src/lib/sync.ts`

Add two validation functions before the `syncAll` function (after `mergeCompletions`, before line 51):

```tsx
function validateHabitRecord(
  r: Record<string, unknown>
): asserts r is {
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

function validateCompletionRecord(
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
```

### Step 2: Use validation in the mapping calls

Replace the two mapping blocks in `syncAll`:

**Replace lines 118-131** with:

```tsx
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
```

**Replace lines 133-141** with:

```tsx
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
```

Note: the assertion types from `validateHabitRecord` and `validateCompletionRecord` narrow `Record<string, unknown>` to the specific shape, so the `as string` casts are no longer needed.

**Verify**: `npx tsc -b` → exit 0, no errors

### Step 3: Add validation tests to `src/lib/sync.test.ts`

Add a new `describe` block before the existing `describe("syncAll"` block:

```tsx
describe("validateHabitRecord", () => {
  it("accepts a valid habit record", () => {
    const record = {
      id: "h1",
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "good" as const,
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    // Should not throw
    expect(() => validateHabitRecord(record as never)).not.toThrow();
  });

  it("throws when id is not a string", () => {
    const record = {
      id: 123,
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "good" as const,
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateHabitRecord(record as never)).toThrow(
      'Invalid habit record: field "id" is not a string'
    );
  });

  it("throws when type is not good or bad", () => {
    const record = {
      id: "h1",
      user_id: "u1",
      name: "Test",
      icon: "Sun",
      type: "invalid" as unknown as "good" | "bad",
      color: "oklch(0.7 0.12 225)",
      button_label: "Done!",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateHabitRecord(record as never)).toThrow(
      'Invalid habit record: field "type" must be "good" or "bad"'
    );
  });
});

describe("validateCompletionRecord", () => {
  it("accepts a valid completion record", () => {
    const record = {
      id: "c1",
      user_id: "u1",
      habit_id: "h1",
      timestamp: "2026-01-01T12:00:00.000Z",
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateCompletionRecord(record as never)).not.toThrow();
  });

  it("throws when timestamp is not a string", () => {
    const record = {
      id: "c1",
      user_id: "u1",
      habit_id: "h1",
      timestamp: 12345,
      synced_at: null,
      deleted_at: null,
    };
    expect(() => validateCompletionRecord(record as never)).toThrow(
      'Invalid completion record: field "timestamp" is not a string'
    );
  });
});
```

You must add exports for the validation functions from `sync.ts` so the tests can import them:

In `src/lib/sync.ts`, add `export` to the function declarations:

```tsx
export function validateHabitRecord(...)
export function validateCompletionRecord(...)
```

And add the import in `src/lib/sync.test.ts`:

```tsx
import { mergeCompletions, mergeHabits, syncAll, validateHabitRecord, validateCompletionRecord } from "./sync.ts";
```

**Verify**: `npm test -- src/lib/sync.test.ts` → all tests pass

### Step 4: Run full test suite

**Verify**: `npm test` → all tests pass (no regressions)

### Step 5: Run linter

**Verify**: `npm exec -- ultracite check` → exit 0, no issues

## Test plan

- New tests in `src/lib/sync.test.ts` in `describe("validateHabitRecord")` and `describe("validateCompletionRecord")` blocks
- Cover: valid records pass, invalid string fields throw, invalid type values throw, nullable fields accept null
- Model after existing `mergeHabits` test pattern in `src/lib/sync.test.ts:33-108`
- Verification: `npm test -- src/lib/sync.test.ts` → all tests pass including new ones

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc -b` exits 0
- [ ] `npm test` exits 0; new validation tests pass
- [ ] `npm exec -- ultracite check` exits 0
- [ ] `grep -rn "as string" src/lib/sync.ts` returns 0 matches (all casts removed)
- [ ] `grep -rn "validateHabitRecord\|validateCompletionRecord" src/lib/sync.ts` returns at least 6 matches (2 declarations + 2 exports + 2 call sites)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- The existing `sync.test.ts` `createMockSupabase` helper returns records with extra fields (like `user_id` in the test fixtures at lines 246-258). The validation functions should accept extra fields — they only check required ones. If you find the tests fail because of this, the validation is already correct (it's opt-in, not exhaustive). Report this as a note, not a blocker.
- TypeScript complains about the type assertion narrowing — if `asserts r is { ... }` doesn't work as expected with `Record<string, unknown>`, fall back to a non-assertion `try { validate(r); return map(r); } catch (e) { throw e; }` pattern.

## Maintenance notes

- The validation is defensive — it throws on bad data rather than silently accepting it. This means any real Supabase data corruption will surface as a runtime error during sync, which is the desired behavior.
- The validation only checks field types, not value ranges (e.g., `createdAt` being a valid ISO date). Adding value-level validation is a future enhancement.
- If new fields are added to the Habit or Completion types (e.g., a `priority` field), the validation functions must be updated to include them.
- The `as never` casts in tests are intentional — the test records have the right shape but TypeScript can't infer the narrowed type from plain object literals. This is a testing pattern, not production code.
