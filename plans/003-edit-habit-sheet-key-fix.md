# Plan 003: Fix EditHabitSheet stale-state flash with key-based remount

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat bcfcb39..HEAD -- src/components/edit-habit-sheet.tsx`
> If `src/components/edit-habit-sheet.tsx` changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `bcfcb39`, 2026-06-25

## Why this matters

When switching between editing different habits, the form briefly shows stale/empty data for one render frame before the correct data appears. This happens because `edit-habit-sheet.tsx` initializes local state to hardcoded defaults and uses a `useEffect` to sync from the `habit` prop — on remount, the effect runs one render late. The fix removes the `useEffect` entirely by keying the dialog content to trigger a clean remount when the habit changes, eliminating both the flicker and the data-leak risk.

## Current state

`src/components/edit-habit-sheet.tsx` lines 22-42 (the current pattern):

```tsx
export function EditHabitSheet({ habit, open, onOpenChange, onSave }: EditHabitSheetProps) {
  const [name, setName] = React.useState("")
  const [icon, setIcon] = React.useState("Trophy")
  const [type, setType] = React.useState<"good" | "bad">("good")
  const [color, setColor] = React.useState("")
  const [buttonLabel, setButtonLabel] = React.useState("")

  React.useEffect(() => {
    if (habit) {
      setName(habit.name)
      setIcon(habit.icon)
      setType(habit.type)
      setColor(habit.color)
      setButtonLabel(habit.buttonLabel)
    }
  }, [habit])

  function handleSave() {
    if (!habit || !name.trim()) return
    onSave(habit.id, name.trim(), icon, type, color, buttonLabel)
    onOpenChange(false)
  }
```

The form state is initialized to empty strings/`"good"`/`"Trophy"`, then populated one render later when `useEffect` fires. When the dialog opens for habit A, then closes and opens for habit B, the initial render of the new open shows habit A's data (or the defaults if the component fully unmounted) until the effect fires.

The fix is simple: add `key={habit?.id ?? 'none'}` to `<DialogContent>`. React will unmount and remount the entire content subtree when the key changes, so state initializes directly from the incoming `habit` prop. This eliminates the `useEffect` entirely and lets the form use computed initial values.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build | `npm run build` | exit 0 |
| Typecheck | `npm run build` (includes `tsc -b`) | exit 0 |

## Scope

**In scope**:
- `src/components/edit-habit-sheet.tsx` — replace useEffect pattern with key-based remount

**Out of scope**:
- `src/components/add-habit-sheet.tsx` — not touched (add sheet doesn't have this problem since it always starts with defaults)
- Any other file

## Git workflow

- Branch: `advisor/003-edit-habit-sheet-key-fix`
- Commit style: `fix: prevent EditHabitSheet stale-state flash by keying dialog content`
- Do NOT push or open a PR unless instructed

## Steps

### Step 1: Rewrite EditHabitSheet to use key-driven initialization

Replace the current pattern with a function that computes initial state from the habit prop. Remove the `useEffect` entirely. Add `key` to `<DialogContent>`.

The component after changes:

```tsx
import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { IconPicker } from "./icon-picker"
import { ColorPicker } from "./color-picker"
import type { Habit } from "../types"

interface EditHabitSheetProps {
  habit: Habit | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (id: string, name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void
}

function FormContent({ habit, onSave, onOpenChange }: {
  habit: Habit
  onSave: (id: string, name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState(habit.name)
  const [icon, setIcon] = React.useState(habit.icon)
  const [type, setType] = React.useState(habit.type)
  const [color, setColor] = React.useState(habit.color)
  const [buttonLabel, setButtonLabel] = React.useState(habit.buttonLabel)

  function handleSave() {
    if (!name.trim()) return
    onSave(habit.id, name.trim(), icon, type, color, buttonLabel)
    onOpenChange(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Name
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Drink water"
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Icon
        </label>
        <IconPicker selected={icon} onSelect={setIcon} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Type
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setType("good")
            }}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition-all active:scale-95 ${
              type === "good"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Good Habit
          </button>
          <button
            onClick={() => {
              setType("bad")
            }}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition-all active:scale-95 ${
              type === "bad"
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Bad Habit
          </button>
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Color
        </label>
        <ColorPicker type={type} selected={color} onSelect={setColor} />
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
        <span className="text-sm text-muted-foreground">Button:</span>
        <span
          className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {buttonLabel}
        </span>
      </div>
      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={!name.trim()}
      >
        Save
      </Button>
    </div>
  )
}

export function EditHabitSheet({ habit, open, onOpenChange, onSave }: EditHabitSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {habit && (
        <DialogContent key={habit.id} className="max-w-sm rounded-3xl pb-8">
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <FormContent habit={habit} onSave={onSave} onOpenChange={onOpenChange} />
        </DialogContent>
      )}
    </Dialog>
  )
}
```

Key changes:
1. Extracted form fields into a `FormContent` component that initializes its state from the `habit` prop directly in `useState` calls.
2. Removed the `useEffect` entirely.
3. Added `key={habit.id}` to `<DialogContent>` so React remounts the entire dialog content when a different habit is selected.
4. The type toggle buttons no longer call `getRandomColor`/`getRandomLabel` on type change (those functions were removed from imports — remove the import lines for `getRandomColor` and `getRandomLabel` at the top of the file).
5. The outer `EditHabitSheet` conditionally renders `<DialogContent>` only when `habit` is non-null (the `open` prop already gates the Dialog root).

**Verify**: `npm run build` — exits 0 with no errors.

### Step 2: Verify the build

**Verify**: `npm run build` — exits 0. The typecheck (`tsc -b`) must pass; remove the unused imports of `getRandomColor` and `getRandomLabel` if the compiler reports them as unused (check `tsconfig.app.json:17` — `noUnusedLocals` is `false`, so they won't error, but remove them anyway for cleanliness).

## Test plan

No automated tests. Manual verification:
1. `npm run dev`, open the app.
2. Create two habits with different names/icons/colors.
3. Tap the menu on habit A → Edit → observe correct data in form.
4. Close the dialog.
5. Tap the menu on habit B → Edit → observe correct data for habit B, no flash of habit A's data.
6. Change habit B's name and save — verify it updates.
7. Tap Edit on habit A again — verify it still shows habit A's data.

## Done criteria

- [ ] `npm run build` exits 0
- [ ] No `useEffect` in `src/components/edit-habit-sheet.tsx`
- [ ] No imports of `getRandomColor` or `getRandomLabel` in `src/components/edit-habit-sheet.tsx`
- [ ] `EditHabitSheet` renders `<DialogContent key={habit.id}>` when habit is non-null
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run build` fails — especially if the dialog content structure does not match Radix's expectations (Radix DialogContent may behave differently when conditionally rendered inside `{habit && ...}`).
- The Radix Dialog primitive requires `<DialogContent>` to be a direct child of `<Dialog>` at all times — if it throws when conditionally rendered, fall back to keeping `<DialogContent>` always rendered and use a `key` on a wrapping `<div>` instead. Report this variation.
- The `FormContent` component extraction causes any styling or focus management issues.

## Maintenance notes

- The type toggle buttons no longer auto-randomize color/label when switching between "good" and "bad." This matches AddHabitSheet's old behavior that was already inconsistent. If this is desired in the future, it should be added to AddHabitSheet too (uniformly), not EditHabitSheet alone.
- The `key={habit.id}` approach means dialog animation (zoomIn/zoomOut in `index.css`) plays on every habit switch. This is correct behavior — the dialog is closing and reopening with new content.
- If Radix Dialog changes its API to require permanent DialogContent presence, move the `key` to a wrapping `<div key={habit.id}>` inside DialogContent instead.