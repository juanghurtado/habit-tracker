import type { Habit, Completion } from "../types"
import { getIcon } from "../lib/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { MoreVertical, Undo2, Pencil, Trash2, ThumbsDown, ThumbsUp } from "lucide-react"

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

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card transition-all"
      style={{ borderColor: `color-mix(in oklch, ${habit.color} 30%, transparent)` }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `color-mix(in oklch, ${habit.color} 10%, transparent)` }}
      />
      <div className="relative z-0 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: `color-mix(in oklch, ${habit.color} 20%, transparent)`,
                color: habit.color,
              }}
            >
              <Icon className="size-5" />
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
              <button
                className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted transition-all active:scale-90"
                style={{
                  color: `color-mix(in oklch, ${habit.color} 50%, var(--color-muted-foreground) 50%)`,
                }}
              >
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
        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold tracking-tight text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.97]"
          style={{ backgroundColor: habit.color }}
          onClick={() => onComplete(habit.id)}
        >
          {habit.type === "bad" ? <ThumbsDown className="size-4" /> : <ThumbsUp className="size-4" />}
          {habit.buttonLabel}
        </button>
      </div>
    </div>
  )
}