import type { Habit, Completion } from "../types"
import { getIcon } from "../lib/icons"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { MoreVertical, Undo2, Pencil, Trash2 } from "lucide-react"

interface HabitCardProps {
  habit: Habit
  completions: Completion[]
  onComplete: (habitId: string) => void
  onUndoLast: (habitId: string) => void
  onEdit: (habit: Habit) => void
  onDelete: (habitId: string) => void
}

export function HabitCard({
  habit,
  completions,
  onComplete,
  onUndoLast,
  onEdit,
  onDelete,
}: HabitCardProps) {
  const Icon = getIcon(habit.icon)
  const count = completions.length
  const isGood = habit.type === "good"

  return (
    <div className="relative rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-12 items-center justify-center rounded-2xl ${
              isGood
                ? "bg-gradient-to-br from-primary/20 to-secondary/15 text-primary"
                : "bg-destructive/15 text-destructive"
            }`}
          >
            <Icon className="size-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">{habit.name}</h3>
            <p className="text-sm font-medium text-muted-foreground">
              {count === 0 ? (
                <span className="italic">Not yet today</span>
              ) : (
                <>{count} {count === 1 ? "time" : "times"} today</>
              )}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:scale-90">
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {count > 0 && (
              <DropdownMenuItem onClick={() => onUndoLast(habit.id)}>
                <Undo2 className="size-4" />
                Undo last
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(habit)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(habit.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button
        variant={isGood ? "complete" : "destructive"}
        size="xl"
        className="mt-4 w-full font-bold tracking-tight active:scale-[0.97]"
        onClick={() => onComplete(habit.id)}
      >
        {isGood ? "I did it!" : "Oops..."}
      </Button>
    </div>
  )
}