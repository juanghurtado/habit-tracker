import * as React from "react"
import { Plus } from "lucide-react"
import { Toaster, toast } from "sonner"
import { useHabits } from "./hooks/use-habits"
import { getCompletionsForHabitOnDate } from "./lib/storage"
import { DateNavigation } from "./components/date-navigation"
import { HabitCard } from "./components/habit-card"
import { AddHabitSheet } from "./components/add-habit-sheet"
import { EditHabitSheet } from "./components/edit-habit-sheet"
import { Button } from "./components/ui/button"
import type { Habit } from "./types"

export default function App() {
  const [date, setDate] = React.useState(new Date())
  const [addOpen, setAddOpen] = React.useState(false)
  const [editHabit, setEditHabit] = React.useState<Habit | null>(null)

  const { habits, completions, addHabit, editHabit: edit, deleteHabit, addCompletion, undoLastCompletion } = useHabits()

  function handleComplete(habitId: string) {
    addCompletion(habitId)
    const habit = habits.find((h) => h.id === habitId)
    toast(habit ? `${habit.name} logged!` : "Logged!", {
      action: {
        label: "Undo",
        onClick: () => undoLastCompletion(habitId),
      },
      duration: 4000,
    })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <header className="sticky top-0 z-10 bg-bg/80 px-4 pb-2 pt-6 backdrop-blur-lg">
        <DateNavigation date={date} onDateChange={setDate} />
      </header>

      <main className="flex-1 space-y-3 px-4 pb-28">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/15">
              <Plus className="size-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Your habits start here</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tap the shiny + button below to add your first habit. Then just tap "I did it!" every time you follow through.
            </p>
          </div>
        ) : (
          habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              completions={getCompletionsForHabitOnDate(completions, habit.id, date)}
              onComplete={handleComplete}
              onUndoLast={undoLastCompletion}
              onEdit={setEditHabit}
              onDelete={deleteHabit}
            />
          ))
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
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
        onSave={(id, name, icon, type) => {
          edit(id, name, icon, type)
        }}
      />

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            padding: "16px 20px",
            color: "var(--color-foreground)",
            fontSize: "0.875rem",
          },
        }}
        style={{ bottom: "80px" }}
      />
    </div>
  )
}