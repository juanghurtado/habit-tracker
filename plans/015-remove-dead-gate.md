# Plan 015: Remove unused Gate component

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3351d5c..HEAD -- src/components/gate.tsx`
> If the file has changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `3351d5c`, 2026-07-01

## Why this matters

`src/components/gate.tsx` defines a `Gate` component that is never imported or rendered anywhere in the app. `App.tsx` goes directly from loading spinner to the main log/stats view. The component is 102 lines of dead code — it was likely part of an earlier entry flow that was replaced by the current topbar-based auth entry. Dead code adds cognitive load and confuses anyone reading the codebase.

## Current state

- `src/components/gate.tsx` — 102 lines, exports `Gate` component
- `src/App.tsx` — does NOT import `Gate`
- `grep -rn "gate" src/` or `grep -rn "Gate" src/` — no imports of this component from any file
- No test file exists for Gate

The component accepts `loading`, `onStart`, and `signIn` props and renders a first-visit screen with "Start tracking" and "Sign in" options. It uses the `GATE_DISMISSED_KEY` localStorage key.

## Commands you will need

| Purpose   | Command                       | Expected on success |
|-----------|-------------------------------|---------------------|
| Typecheck | `npx tsc -b --noEmit`          | exit 0, no errors   |
| Tests     | `npx vitest run`              | all pass            |
| Lint      | `npm exec -- ultracite check`  | exit 0              |

## Scope

**In scope**:
- `src/components/gate.tsx` — delete this file

**Out of scope**:
- `src/App.tsx` — do NOT modify (it doesn't reference Gate)
- Any other components
- localStorage keys related to the gate (they're harmless no-ops)

## Git workflow

- Branch: `advisor/015-remove-dead-gate`
- Commit: `chore: remove unused Gate component`

## Steps

### Step 1: Verify Gate is truly unreferenced

Run: `grep -rn "gate\|Gate" src/ --include="*.ts" --include="*.tsx"` 

Expected: matches only in `gate.tsx` itself (its own imports/exports). No other file should reference it.

**If other files DO reference Gate**: STOP and report back — the component isn't dead code.

### Step 2: Delete gate.tsx

Remove the file: `rm src/components/gate.tsx`

**Verify**: `npx tsc -b --noEmit` → exit 0 (confirms no imports broken)

### Step 3: Run full verification

**Verify**: `npm exec -- ultracite check` → exit 0
**Verify**: `npx vitest run` → all tests pass
**Verify**: `ls src/components/gate.tsx` → file not found

## Test plan

No tests to add or modify — the component had no tests and isn't used.

## Done criteria

- [ ] `src/components/gate.tsx` does not exist
- [ ] `npx tsc -b --noEmit` exits 0
- [ ] `npx vitest run` exits 0
- [ ] `npm exec -- ultracite check` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- `grep` reveals Gate is imported by any file (it's not dead — stop and report)
- A step's verification fails twice

## Maintenance notes

- The `GATE_DISMISSED_KEY = "habit-tracker-gate-dismissed"` localStorage key may exist in users' browsers. It's a harmless string that takes ~30 bytes — not worth a migration to clean up.
- If the Gate concept is revisited in the future, it should be re-created from scratch rather than resurrecting this file, since the app's auth flow has changed significantly.
