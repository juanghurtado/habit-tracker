# Plan 007: Remove unused exports (HabitCard, getButtonColor, findPaletteColor, formatUTCDateKey)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 581ee39..HEAD -- src/`
> If any file under `src/` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `581ee39`, 2026-06-25

## Why this matters

Four dead exports clutter the codebase. The `HabitCard` component (106 lines) is the most misleading — it looks like the active card renderer but is never imported, while `daily-log.tsx` renders cards inline with completely different markup. Three utility functions (`getButtonColor`, `findPaletteColor`, `formatUTCDateKey`) are exported but never called anywhere. Removing them removes confusion for future developers, trims bundle size slightly, and simplifies the API surface.

## Current state

**`src/components/habit-card.tsx`** — a 106-line component that defines `HabitCard` with props `habit`, `completions`, `onComplete`, `onUndoLast`, `onEdit`, `onDelete`. It renders a bordered card with an icon, name, count, dropdown menu, and action button. This component is **exported but never imported anywhere** in `src/`. The active card rendering lives inline in `daily-log.tsx:81-155`.

**`src/lib/colors.ts:47-56`** — two exported, unused functions:

```ts
export function getButtonColor(color: string): string {
  const match = color.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/)
  if (!match) return color
  const l = Math.min(parseFloat(match[1]) * 0.62, 0.48)
  return `oklch(${l.toFixed(2)} ${match[2]} ${match[3]})`
}

export function findPaletteColor(value: string): PaletteColor | undefined {
  return [...goodColors, ...badColors].find((c) => c.value === value)
}
```

**`src/lib/storage.ts:91-96`** — one exported, unused function:

```ts
export function formatUTCDateKey(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Build     | `npm run build`          | exit 0              |
| Typecheck | `npx tsc --noEmit -p tsconfig.app.json` | exit 0 |
| Tests     | `npm test`               | all pass            |

## Scope

**In scope**:
- `src/components/habit-card.tsx` — delete the file
- `src/lib/colors.ts` — delete `getButtonColor` and `findPaletteColor` functions and the unused `PaletteColor` import (it's still used by the palette arrays, so keep the type)
- `src/lib/storage.ts` — delete `formatUTCDateKey` function

**Out of scope**:
- `src/components/daily-log.tsx` — do NOT refactor the inline card render to use a component; that's a separate design decision
- Any other dead code not listed above
- Any behavior changes beyond removing exports

## Git workflow

- Branch: `advisor/007-dead-code-cleanup`
- Commit message style: `chore: remove dead code habit-card, getButtonColor, findPaletteColor, formatUTCDateKey`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Delete `src/components/habit-card.tsx`

Delete the entire file with `rm src/components/habit-card.tsx`.

**Verify**: `ls src/components/habit-card.tsx` → "No such file or directory". `npm run build` → exit 0.

### Step 2: Remove `getButtonColor` and `findPaletteColor` from `src/lib/colors.ts`

Open `src/lib/colors.ts`. Delete lines 47–56 (the two functions `getButtonColor` and `findPaletteColor`). The `PaletteColor` interface (lines 1–5) and the `allColors`, `goodColors`, `badColors` arrays must remain untouched. After deletion, the file should end at the `getRandomColor` function (line 45 after deletion).

**Verify**: `npm run build` → exit 0. `npm test` → all tests pass.

### Step 3: Remove `formatUTCDateKey` from `src/lib/storage.ts`

Open `src/lib/storage.ts`. Delete lines 91–96 (the `formatUTCDateKey` function).

**Verify**: `npm run build` → exit 0. `npm test` → all tests pass.

## Test plan

No new tests needed — these are deletions of unreachable code. The existing test suite must continue to pass unchanged. If a test fails, it means the function was actually used (a STOP condition).

## Done criteria

- [ ] `ls src/components/habit-card.tsx` returns "No such file or directory"
- [ ] `grep -rn "getButtonColor\|findPaletteColor\|formatUTCDateKey" src/` returns no matches (excluding comments)
- [ ] `npm run build` exits 0
- [ ] `npm test` exits 0, same test count as before (31 passing, 2 skipped)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:
- `habit-card.tsx` is imported anywhere (check with `grep -rn "habit-card" src/` first)
- `getButtonColor`, `findPaletteColor`, or `formatUTCDateKey` are imported anywhere
- Deleting any of these causes a build or test failure (means the code has drifted)
- Any file not listed in scope was modified

## Maintenance notes

- If a future card design is needed, build it directly in `daily-log.tsx` or create a new component — but `habit-card.tsx` should not be re-created as its API doesn't match the current rendering approach.
- The `getButtonColor` logic computed a darker variant of a habit's color for button text contrast. If that's needed in the future, it should be re-implemented as a CSS `color-mix()` approach rather than a parsing function.