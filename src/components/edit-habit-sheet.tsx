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
            onClick={() => { setType("good") }}
            className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition-all active:scale-95 ${
              type === "good"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Good Habit
          </button>
          <button
            onClick={() => { setType("bad") }}
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
