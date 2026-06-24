import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { IconPicker } from "./icon-picker"

interface AddHabitSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, icon: string, type: "good" | "bad") => void
}

export function AddHabitSheet({ open, onOpenChange, onSave }: AddHabitSheetProps) {
  const [name, setName] = React.useState("")
  const [icon, setIcon] = React.useState("Trophy")
  const [type, setType] = React.useState<"good" | "bad">("good")

  function handleSave() {
    if (!name.trim()) return
    onSave(name.trim(), icon, type)
    setName("")
    setIcon("Trophy")
    setType("good")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl pb-8">
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
        </DialogHeader>
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
                onClick={() => setType("good")}
                className={`flex-1 rounded-xl px-4 py-3 text-center text-sm font-medium transition-all active:scale-95 ${
                  type === "good"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Good Habit
              </button>
              <button
                onClick={() => setType("bad")}
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
          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Add Habit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}