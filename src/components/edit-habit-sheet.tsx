import { useState } from "react";
import { getRandomLabel } from "../lib/button-labels.ts";
import { getRandomColor } from "../lib/colors.ts";
import type { Habit } from "../types.ts";
import { ColorPicker } from "./color-picker.tsx";
import { IconPicker } from "./icon-picker.tsx";
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.tsx";

interface EditHabitSheetProps {
  habit: Habit | null;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    name: string,
    icon: string,
    type: "good" | "bad",
    color: string,
    buttonLabel: string
  ) => void;
  open: boolean;
}

function FormContent({
  habit,
  onSave,
  onOpenChange,
}: {
  habit: Habit;
  onSave: (
    id: string,
    name: string,
    icon: string,
    type: "good" | "bad",
    color: string,
    buttonLabel: string
  ) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(habit.name);
  const [icon, setIcon] = useState(habit.icon);
  const [type, setType] = useState(habit.type);
  const [color, setColor] = useState(habit.color);
  const [buttonLabel, setButtonLabel] = useState(habit.buttonLabel);

  function handleSave() {
    if (!name.trim()) {
      return;
    }
    onSave(habit.id, name.trim(), icon, type, color, buttonLabel);
    onOpenChange(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          className="mb-2 block font-medium text-muted-foreground text-sm"
          htmlFor="edit-habit-name"
        >
          Name
        </label>
        <input
          autoFocus
          className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
          id="edit-habit-name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="e.g. Drink water"
          value={name}
        />
      </div>
      <div>
        <label
          className="mb-2 block font-medium text-muted-foreground text-sm"
          htmlFor="edit-habit-icon"
        >
          Icon
        </label>
        <div id="edit-habit-icon">
          <IconPicker onSelect={setIcon} selected={icon} />
        </div>
      </div>
      <div>
        <label
          className="mb-2 block font-medium text-muted-foreground text-sm"
          htmlFor="edit-habit-type"
        >
          Type
        </label>
        <div className="flex gap-2" id="edit-habit-type">
          <button
            className={`flex-1 rounded-xl px-4 py-3 text-center font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
              type === "good"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => {
              setType("good");
              setColor(getRandomColor("good"));
              setButtonLabel(getRandomLabel("good"));
            }}
            type="button"
          >
            Good Habit
          </button>
          <button
            className={`flex-1 rounded-xl px-4 py-3 text-center font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
              type === "bad"
                ? "bg-destructive text-destructive-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => {
              setType("bad");
              setColor(getRandomColor("bad"));
              setButtonLabel(getRandomLabel("bad"));
            }}
            type="button"
          >
            Bad Habit
          </button>
        </div>
      </div>
      <div>
        <label
          className="mb-2 block font-medium text-muted-foreground text-sm"
          htmlFor="edit-habit-color"
        >
          Color
        </label>
        <div id="edit-habit-color">
          <ColorPicker onSelect={setColor} selected={color} type={type} />
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
        <span className="text-muted-foreground text-sm">Button:</span>
        <span
          className="rounded-full px-4 py-1.5 font-bold text-sm text-white"
          style={{ backgroundColor: color }}
        >
          {buttonLabel}
        </span>
      </div>
      <Button
        className="w-full"
        disabled={!name.trim()}
        onClick={handleSave}
        size="lg"
      >
        Save
      </Button>
    </div>
  );
}

export function EditHabitSheet({
  habit,
  open,
  onOpenChange,
  onSave,
}: EditHabitSheetProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      {habit && (
        <DialogContent className="max-w-sm rounded-3xl pb-8" key={habit.id}>
          <DialogHeader>
            <DialogTitle>Edit Habit</DialogTitle>
          </DialogHeader>
          <FormContent
            habit={habit}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
