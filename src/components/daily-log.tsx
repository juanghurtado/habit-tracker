import { Plus, Smile, Frown, MoreVertical, Undo2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import confetti from "canvas-confetti"
import { useHabits } from "../hooks/use-habits"
import { getIcon } from "../lib/icons"
import { getCompletionsForHabitOnDate } from "../lib/storage"
import { getRandomToastMessage } from "../lib/toast-messages"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { DateNavigation } from "./date-navigation"
import { AddHabitSheet } from "./add-habit-sheet"
import { EditHabitSheet } from "./edit-habit-sheet"
import { Button } from "./ui/button"
import type { Habit } from "../types"
import * as React from "react"

interface DailyLogProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function DailyLog({ date, onDateChange }: DailyLogProps) {
  const [addOpen, setAddOpen] = React.useState(false)
  const [editHabit, setEditHabit] = React.useState<Habit | null>(null)

  const { habits, completions, addHabit, editHabit: edit, deleteHabit, addCompletion, undoLastCompletion } = useHabits()

  function handleComplete(habitId: string) {
    addCompletion(habitId, date)
    const habit = habits.find((h) => h.id === habitId)
    if (!habit) return

    const message = getRandomToastMessage(habit.type, habit.name)
    const Icon = habit.type === "good" ? Smile : Frown

    if (habit.type === "good") {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
      })
    }

    toast(message, {
      icon: <Icon className="size-4" style={{ color: habit.color }} />,
      style: {
        background: `color-mix(in oklch, ${habit.color} 22%, white)`,
      },
      className: habit.type === "bad" ? "ToastWobble" : undefined,
      action: {
        label: "Undo",
        onClick: () => undoLastCompletion(habitId),
      },
      duration: 4000,
    })
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 px-4 pb-4 pt-6">
        <DateNavigation date={date} onDateChange={onDateChange} />
      </header>

      <main className="flex-1 px-4 pb-28">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/15">
              <Plus className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Your habits start here</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tap the shiny + button below to add your first habit.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {habits.map((habit) => {
              const habitCompletions = getCompletionsForHabitOnDate(completions, habit.id, date)
              const count = habitCompletions.length
              const Icon = getIcon(habit.icon)
return (
                <div key={habit.id} className="relative h-full">
                  <button
                    onClick={() => handleComplete(habit.id)}
                    className="flex h-full w-full flex-col items-center justify-center rounded-2xl p-5 text-center transition-all active:scale-[0.96]"
                    style={{ backgroundColor: `color-mix(in oklch, ${habit.color} 22%, white)` }}
                  >
                    {count > 0 && (
                      <div
                        className="absolute left-2.5 top-2.5 flex size-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: habit.color }}
                      >
                        {habit.type === "good" ? <Smile className="size-4" /> : <Frown className="size-4" />}
                      </div>
                    )}
                    <div
                      className="mb-2 flex size-12 items-center justify-center rounded-2xl text-white transition-transform hover:scale-110"
                      style={{ backgroundColor: habit.color }}
                    >
                      <Icon className="size-6" />
                    </div>
                    <h3 className="text-sm font-bold leading-tight">{habit.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {count === 0 ? <span className="italic">Not yet today</span> : <>{count} {count === 1 ? "time" : "times"}</>}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-1.5 top-1.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-black/5"
                      >
                        <MoreVertical className="size-5" style={{ color: habit.color }} />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {count > 0 && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            undoLastCompletion(habit.id)
                          }}
                        >
                          <Undo2 className="size-4" />
                          Undo last
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditHabit(habit)
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteHabit(habit.id)
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-20">
        <Button
          variant="accent"
          size="xl"
          className="h-16 w-16 rounded-full p-0 shadow-xl"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-8" />
        </Button>
      </div>

      <AddHabitSheet open={addOpen} onOpenChange={setAddOpen} onSave={addHabit} />

      <EditHabitSheet
        habit={editHabit}
        open={editHabit !== null}
        onOpenChange={(open) => { if (!open) setEditHabit(null) }}
        onSave={(id, name, icon, type, color, buttonLabel) => {
          edit(id, name, icon, type, color, buttonLabel)
        }}
      />
    </div>
  )
}