# Plan 023: Extract shared habit form component from add/edit sheets

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat b469fba..HEAD -- src/components/add-habit-sheet.tsx src/components/edit-habit-sheet.tsx`
> If either sheet has changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW — pure refactoring, no behavior change
- **Depends on**: plans/010-ui-layer-tests.md (adds `add-habit-sheet.test.tsx`) — existing tests ensure we don't break
- **Category**: tech-debt
- **Planned at**: commit `b469fba`, 2026-07-08
- **Issue**: —

## Why this matters

`AddHabitSheet` (`src/components/add-habit-sheet.tsx`, 155 lines) and `EditHabitSheet` (`src/components/edit-habit-sheet.tsx`, 183 lines) share ~70% identical form DOM: name input, icon picker, type toggle (good/bad with color reset), color picker, button label preview, and save/cancel buttons. The only differences are:
- The initial preselected values (Add uses random defaults; Edit reads from `habit`)
- The form field IDs (`habit-name` vs `edit-habit-name`, etc.)
- The `onSave` signature (add omits `id`, edit accepts it)
- Title text ("New Habit" vs "Edit Habit")

This duplication is the largest structural redundancy in the codebase. Any form field change must be applied to 2+ places, and the type toggle resets color/label in two separate `onTypeChange` handlers. Extracting a shared `HabitForm` component eliminates all duplication and future-adds one fewer place to break.

## Current state

**AddHabitSheet** (`src/components/add-habit-sheet.tsx`):
```tsx
interface AddHabitSheetProps {
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  open: boolean;
}
// Manages: name, icon, type, color, buttonLabel with getRandomColor/getRandomLabel defaults
// Form fields: name input (id="habit-name"), icon picker (id="habit-icon"), type toggle (id="habit-type"), color picker (id="habit-color")
```

**EditHabitSheet** (`src/components/edit-habit-sheet.tsx`):
```tsx
interface EditHabitSheetProps {
  habit: Habit | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  open: boolean;
}
// Contains a nested FormContent component (lines 29-159) that matches AddHabitSheet body
// Form fields: name input (id="edit-habit-name"), icon picker (id="edit-habit-icon"), type toggle (id="edit-habit-type"), color picker (id="edit-habit-color")
// Uses key={habit.id} on DialogContent to force remount on habit change (from plan 003)
```

**Key implementation detail**: the DialogContent in `EditHabitSheet` uses `key={habit.id}` to force remount when the habit changes. This needs to transfer to the shared component.

## Commands you will need

| Purpose   | Command                              | Expected on success |
|-----------|--------------------------------------|---------------------|
| Typecheck | `tsc --noEmit`                       | exit 0, no errors   |
| Tests     | `npm run test`                       | all 130+ tests pass |
| Lint      | `npm run lint`                       | exit 0              |
| Build     | `npm run build`                      | exit 0              |

## Scope

**In scope** (files to modify):
- `src/components/habit-form.tsx` — create: shared form component
- `src/components/add-habit-sheet.tsx` — refactor: delegate to `HabitForm`
- `src/components/edit-habit-sheet.tsx` — refactor: delegate to `HabitForm`

**Out of scope** (do NOT touch):
- No changes to the `HabitForm` public API beyond what's specified below
- No changes to dialog wrapper structure (keep Dialog/DialogContent in each sheet)
- No changes to add-habit-sheet.test.tsx (existing tests must still pass through the refactored code)
- No changes to edit-habit-sheet.test.tsx

## Git workflow

- Branch: `advisor/023-shared-form`
- Commit per step; message style: `fix: extract shared HabitForm component from add/edit sheets`
- Example from git log: `a43384a Collapse useHabits god-module into store + scheduler + CRUD adapter`

## Steps

### Step 1: Create `src/components/habit-form.tsx`

Create a new file. The component represents the entire form body (inputs, pickers, label preview) with no dialog wrapper:

```tsx
import type { Habit } from "../types.ts";
import { getRandomColor } from "../lib/colors.ts";
import { getRandomLabel } from "../lib/button-labels.ts";
import { Button } from "./ui/button.tsx";
import { ColorPicker } from "./color-picker.tsx";
import { IconPicker } from "./icon-picker.tsx";

interface HabitFormProps {
  /** Habit to edit, or undefined for create mode */
  initialHabit?: Habit;
  /** Whether the form is in edit mode (true) or create mode (false) */
  mode: "create" | "edit";
  /** Called with form values when the user saves */
  onSave: (name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  /** Called when the dialog closes — used to reset internal state */
  onOpenChange?: (open: boolean) => void;
}

export function HabitForm({ initialHabit, mode, onSave, onOpenChange }: HabitFormProps) {
  const isEdit = mode === "edit";
  const defaultName = isEdit ? initialHabit!.name : "";
  const defaultIcon = isEdit ? initialHabit!.icon : "Trophy";
  const defaultType = isEdit ? initialHabit!.type : "good";
  const defaultColor = isEdit ? initialHabit!.color : getRandomColor("good");
  const defaultButtonLabel = isEdit ? initialHabit!.buttonLabel : getRandomLabel("good");

  const [name, setName] = useState(defaultName);
  const [icon, setIcon] = useState(defaultIcon);
  const [type, setType] = useState(defaultType);
  const [color, setColor] = useState(defaultColor);
  const [buttonLabel, setButtonLabel] = useState(defaultButtonLabel);

  // Sync when the habit prop changes (for edit mode, habit could swap)
  useEffect(() => {
    if (isEdit && initialHabit) {
      setName(initialHabit.name);
      setIcon(initialHabit.icon);
      setType(initialHabit.type);
      setColor(initialHabit.color);
      setButtonLabel(initialHabit.buttonLabel);
    }
  }, [isEdit, initialHabit]);

  // ... rest of the form body exactly matching the current AddHabitSheet body
  // (name input, icon picker, type toggle, color picker, button label preview, save button)
}
```

**Type signature must be:**
```tsx
interface HabitFormProps {
  initialHabit?: Habit;
  mode: "create" | "edit";
  onSave: (name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  onOpenChange?: (open: boolean) => void;
}
```

**Form field IDs** — use `"habit-name"` for create mode, `"edit-habit-name"` for edit mode. Implement the IDs inline rather than deriving them (simpler, fewer edge cases).

**Save button label** — use "Add Habit" for create mode, "Save" for edit mode.

**The form body (name input, icon picker, type toggle, color picker, button label display, and save button) must be written ONCE in `HabitForm`.** The current AddHabitSheet body at lines 56-152 is the canonical implementation to extract.

Verify with:
```bash
npm run lint 2>&1 | tail -20
```
Expect: no errors. The file should follow the repo's conventions exactly.

### Step 2: Refactor `src/components/add-habit-sheet.tsx`

Replace the entire component body with a `Dialog` that wraps `HabitForm`:

```tsx
import { getRandomColor } from "../lib/colors.ts";
import { getRandomLabel } from "../lib/button-labels.ts";
import { HabitForm } from "./habit-form.tsx";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx";

interface AddHabitSheetProps {
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  open: boolean;
}

export function AddHabitSheet({ open, onOpenChange, onSave }: AddHabitSheetProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm rounded-3xl pb-8">
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
        </DialogHeader>
        <HabitForm mode="create" onSave={onSave} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
```

The resulting `add-habit-sheet.tsx` should be ~25 lines. Remove all form state management and form field JSX — they all live in `HabitForm`.

Verify:
```bash
npm run test -- add-habit-sheet
```
Expect: all existing tests pass.

### Step 3: Refactor `src/components/edit-habit-sheet.tsx`

Replace the entire file with:

```tsx
import { HabitForm } from "./habit-form.tsx";
import { Button } from "./ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx";

interface EditHabitSheetProps {
  habit: Habit | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, name: string, icon: string, type: "good" | "bad", color: string, buttonLabel: string) => void;
  open: boolean;
}

export function EditHabitSheet({ habit, onOpenChange, onSave }: EditHabitSheetProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {habit && (
        <DialogContent className="max-w-sm rounded-3xl pb-8" key={habit.id}>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <HabitForm
            mode="edit"
            initialHabit={habit}
            onSave={(name, icon, type, color, buttonLabel) => {
              onSave(habit.id, name, icon, type, color, buttonLabel);
            }}
            onOpenChange={(open) => {
              if (!open) {
                onOpenChange(false);
              }
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
```

The `key={habit.id}` must be retained on `DialogContent` to preserve the remount-on-habit-change behavior from plan 003. The `onOpenChange` wrapper ensures the edit sheet's parent is notified when the dialog closes, resetting `setEditHabit(null)` in DailyLog.

Verify:
```bash
npm run test
```
Expect: ALL tests pass (130+ total), not just edit-habit-sheet tests.

### Step 4: Run full verification

```bash
npm run test
npm run lint
npm run build
```

**Expected**: all tests pass, no lint errors, clean build.

## Test plan

**New tests**: None — the existing `add-habit-sheet.test.tsx` is the structural pattern and must pass. The existing tests should continue to work because:
- `AddHabitSheet` still renders with the same props
- The dialog still renders "New Habit" title and the same form behavior
- Only the internal component breakdown changed

**Existing tests to verify**:
- `npm run test -- add-habit-sheet` — AddHabitSheet still renders and submits correctly
- `npm run test -- edit-habit-sheet` — EditHabitSheet still renders and submits correctly

**Verification**: `npm run test` → all 130+ tests pass, including the 4 `add-habit-sheet` tests and 4 `edit-habit-sheet` tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `tsc --noEmit` exits 0
- [ ] `npm run test` exits 0; all 130+ tests pass
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "getRandomColor" src/components/add-habit-sheet.tsx` returns no matches (moved to HabitForm)
- [ ] `grep -rn "getRandomLabel" src/components/add-habit-sheet.tsx` returns no matches (moved to HabitForm)
- [ ] `grep -rn "getColor" src/components/edit-habit-sheet.tsx` returns no matches (moved to HabitForm)
- [ ] `wc -l src/components/add-habit-sheet.tsx` shows ~25 lines (was 155)
- [ ] `wc -l src/components/edit-habit-sheet.tsx` shows ~35 lines (was 183)
- [ ] `src/components/habit-form.tsx` exists and is non-empty
- [ ] No files outside the in-scope list are modified

## STOP conditions

Stop and report back (do not improvise) if:

- The AddHabitSheet body contains form elements that don't match the excerpt above (codebase has drifted).
- Any of the existing tests fail after refactoring — the tests should pass immediately because behavior hasn't changed.
- The form field IDs differ between add and edit modes in a way that breaks test assertions (e.g. `daily-log.test.tsx` looks for specific IDs).
- `grep -rn "id=" src/components/add-habit-sheet.tsx` still contains `edit-habit` IDs or vice versa.

## Maintenance notes

- The shared `HabitForm` component is now a touchstone for any habit form changes. If a new field needs to be added (e.g., "color name visibility toggle"), modify `HabitForm` only.
- If the dialog wrapper structure changes (e.g., we want to control the dialog from a parent instead of the sheet), the change should be coordinated between AddHabitSheet, EditHabitSheet, and DailyLog.
- Reviewers should check that `onOpenChange` is correctly wired in both sheets — a common bug is forgetting to call the wrapper's `onOpenChange` in `EditHabitForm`.
- The `onOpenChange` callback in `EditHabitSheet` is used to reset the parent's `setEditHabit(null)`. Ensure this is not lost in any future refactoring.
