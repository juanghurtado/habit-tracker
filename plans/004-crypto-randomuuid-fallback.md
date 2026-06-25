# Plan 004: Add crypto.randomUUID fallback for older browsers

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/lib/storage.ts`
> If `src/lib/storage.ts` changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `bcfcb39`, 2026-06-25

## Why this matters

`crypto.randomUUID()` is available in Chrome 92+ (2021), Firefox 95+ (2021), Safari 15.4+ (2022). iOS Safari 15.0–15.3 and older Android WebViews do not have it. Calling it on those browsers throws `TypeError: crypto.randomUUID is not a function`, crashing the app when the user tries to add a habit or log a completion. A one-line fallback prevents the crash with no behavior change on modern browsers.

## Current state

`src/lib/storage.ts:8-10`:
```ts
function generateId(): string {
  return crypto.randomUUID()
}
```

This is called from:
- `src/lib/storage.ts:51` — inside `createHabit`
- `src/lib/storage.ts:63` — inside `createCompletion`

Repo convention: `createHabit` and `createCompletion` are pure factory functions in `src/lib/storage.ts`. The rest of the codebase imports them. No UUID library is in `package.json` — the fix should be self-contained.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:
- `src/lib/storage.ts` — add a fallback for `crypto.randomUUID`

**Out of scope**:
- Any other file
- Adding a UUID library dependency (use the standard two-line fallback instead)

## Git workflow

- Branch: `advisor/004-crypto-randomuuid-fallback`
- Commit style: `fix: add crypto.randomUUID fallback for older browsers`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Replace `crypto.randomUUID()` with a fallback pattern

In `src/lib/storage.ts`, replace line 9:

Before:
```ts
  return crypto.randomUUID()
```

After:
```ts
  return crypto.randomUUID?.() ?? `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
```

This works as follows:
- If `crypto.randomUUID` exists (modern browsers), it's called via optional chaining `?.()` and its result is returned.
- If it doesn't exist (older browsers), the fallback generates a UUID v4 using `Math.random()` — the standard pattern used in many libraries, producing a valid UUID that matches the v4 format (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`).

**Verify**: `npm run build` — exits 0 with no errors.

### Step 2: Verify the build

**Verify**: `npm run build` — exits 0.

## Test plan

No automated tests needed — the fix is a one-line change. If plan 001 (test infrastructure) has been executed, the `createHabit` and `createCompletion` tests will validate that IDs are still generated:

- `npx vitest run src/lib/storage.test.ts` — all tests pass.

Manual verification:
1. `npm run dev`, open the app.
2. Add a new habit — verify it's created with a visible UUID in localStorage (`habit-tracker-habits` key).
3. Log a completion — verify it's created.
4. Edit and delete habits — verify all operations still work.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] `src/lib/storage.ts` `generateId()` uses `crypto.randomUUID?.()` with a `Math.random()` fallback
- [ ] If plan 001 was executed: `npx vitest run` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run build` fails — unlikely for this change, but if the optional chaining `?.()` syntax is not supported, check `tsconfig.app.json` target (it's `ES2020` which supports optional chaining).
- The old browser fallback UUID function doesn't produce valid UUID v4 format — verify by running the regex in a browser console if needed.

## Maintenance notes

- The fallback uses `Math.random()`, which is not cryptographically secure. This is acceptable for a local-only habit tracker — UUIDs don't protect sensitive resources.
- If the app ever moves to server-side storage where UUID predictability matters, replace this function with `crypto.randomUUID()` exclusively or import a proper UUID library like `nanoid`.
- The optional chaining `?.()` pattern also handles the edge case where `crypto` exists but `crypto.randomUUID` is not a function (some older browsers have `crypto` for `getRandomValues` but not `randomUUID`).