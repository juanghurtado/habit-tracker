import { useState } from "react";
import { getRandomLabel } from "../lib/button-labels.ts";
import { getRandomColor } from "../lib/colors.ts";
import { ColorPicker } from "./color-picker.tsx";
import { IconPicker } from "./icon-picker.tsx";
import { Button } from "./ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.tsx";

interface AddHabitSheetProps {
  onOpenChange: (open: boolean) => void;
  onSave: (
    name: string,
    icon: string,
    type: "good" | "bad",
    color: string,
    buttonLabel: string
  ) => void;
  open: boolean;
}

export function AddHabitSheet({
  open,
  onOpenChange,
  onSave,
}: AddHabitSheetProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Trophy");
  const [type, setType] = useState<"good" | "bad">("good");
  const [color, setColor] = useState(getRandomColor("good"));
  const [buttonLabel, setButtonLabel] = useState(getRandomLabel("good"));

  function handleSave() {
    if (!name.trim()) {
      return;
    }
    onSave(name.trim(), icon, type, color, buttonLabel);
    setName("");
    setIcon("Trophy");
    setType("good");
    setColor(getRandomColor("good"));
    setButtonLabel(getRandomLabel("good"));
    onOpenChange(false);
  }

  function handleTypeChange(newType: "good" | "bad") {
    setType(newType);
    setColor(getRandomColor(newType));
    setButtonLabel(getRandomLabel(newType));
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm rounded-3xl pb-8">
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <label
              className="mb-2 block font-medium text-muted-foreground text-sm"
              htmlFor="habit-name"
            >
              Name
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
              id="habit-name"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Drink water"
              value={name}
            />
          </div>
          <div>
            <label
              className="mb-2 block font-medium text-muted-foreground text-sm"
              htmlFor="habit-icon"
            >
              Icon
            </label>
            <div id="habit-icon">
              <IconPicker onSelect={setIcon} selected={icon} />
            </div>
          </div>
          <div>
            <label
              className="mb-2 block font-medium text-muted-foreground text-sm"
              htmlFor="habit-type"
            >
              Type
            </label>
            <div className="flex gap-2" id="habit-type">
              <button
                className={`flex-1 rounded-xl px-4 py-3 text-center font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 ${
                  type === "good"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => handleTypeChange("good")}
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
                onClick={() => handleTypeChange("bad")}
                type="button"
              >
                Bad Habit
              </button>
            </div>
          </div>
          <div>
            <label
              className="mb-2 block font-medium text-muted-foreground text-sm"
              htmlFor="habit-color"
            >
              Color
            </label>
            <div id="habit-color">
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
            Add Habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
