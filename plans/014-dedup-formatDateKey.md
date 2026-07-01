# Plan 014: Deduplicate formatDateKey into shared utility

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3351d5c..HEAD -- src/lib/storage.ts src/lib/compute-stats.ts src/lib/utils.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `3351d5c`, 2026-07-01

## Why this matters

`formatDateKey` is implemented identically in two files: `src/lib/storage.ts:129-134` and `src/lib/compute-stats.ts:28-33`. Both convert a `Date` to `YYYY-MM-DD` using local time. If one is changed and the other isn't, date-based queries break silently. The canonical home is `src/lib/utils.ts`, which already exports the `cn` utility — it's the repo's shared utility module.

## Current state

Both implementations are identical:

```typescript
// src/lib/storage.ts:129-134
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// src/lib/compute-stats.ts:28-33 (private function, not exported)
function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
```

`src/lib/utils.ts` currently only exports `cn`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Tests     | `npx vitest run`              | all pass            |
| Typecheck | `npx tsc -b --noEmit`          | exit 0, no errors   |
| Lint      | `npm exec -- ultracite check`  | exit 0              |

## Scope

**In scope**:
- `src/lib/utils.ts` — add `formatDateKey` export
- `src/lib/storage.ts` — remove local `formatDateKey`, import from utils
- `src/lib/compute-stats.ts` — remove local `formatDateKey`, import from utils

**Out of scope**:
- Any test files (existing tests should pass without changes)
- Any component files

## Git workflow

- Branch: `advisor/014-dedup-formatDateKey`
- Commit: `refactor: extract formatDateKey to shared utils module`

## Steps

### Step 1: Add formatDateKey to utils.ts

Add the function to `src/lib/utils.ts` after the existing `cn` export:

```typescript
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 2: Update storage.ts to import from utils

In `src/lib/storage.ts`:
1. Add `import { formatDateKey } from "./utils.ts";` at the top (after the existing imports)
2. Remove the local `formatDateKey` function definition (lines 129-134)
3. Keep the `export` on the import — no, wait. The function is used externally by `daily-log.tsx` via `getCompletionsForHabitOnDate`. Check if `formatDateKey` is imported by any other file. If it is, re-export it from storage.ts. If not, consumers should import from utils.ts directly.

Actually: `formatDateKey` in storage.ts is exported. Let's check who imports it.

**Verify**: `grep -rn "formatDateKey" src/` → find all importers

If other files import `formatDateKey` from storage.ts, add a re-export: `export { formatDateKey } from "./utils.ts";` to maintain backward compatibility. If no other file imports it, just remove the export and the function.

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 3: Update compute-stats.ts to import from utils

In `src/lib/compute-stats.ts`:
1. Add `import { formatDateKey } from "./utils.ts";` at the top
2. Remove the local `formatDateKey` function definition (lines 28-33)

**Verify**: `npx tsc -b --noEmit` → exit 0

### Step 4: Run full verification

**Verify**: `npm exec -- ultracite check` → exit 0
**Verify**: `npx vitest run` → all tests pass (no test changes needed — same behavior)
**Verify**: `grep -rn "function formatDateKey" src/` → only one match in `src/lib/utils.ts`

## Test plan

No new tests needed — this is a pure refactor. Existing tests in `src/lib/storage.test.ts` and `src/lib/compute-stats.test.ts` validate the same behavior.

## Done criteria

- [ ] `npx tsc -b --noEmit` exits 0
- [ ] `npx vitest run` exits 0
- [ ] `npm exec -- ultracite check` exits 0
- [ ] `grep -rn "function formatDateKey" src/` returns exactly 1 match (in utils.ts)
- [ ] No files outside `src/lib/utils.ts`, `src/lib/storage.ts`, `src/lib/compute-stats.ts` are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `grep -rn "formatDateKey" src/` reveals imports from files not in scope
- The two implementations have actually diverged (they haven't, but verify)
- A step's verification fails twice

## Maintenance notes

- Future date formatting needs should go in `src/lib/utils.ts`.
- The parameter name differs slightly between the two originals (`date` vs `d`) — use `date` in the shared version for clarity.
