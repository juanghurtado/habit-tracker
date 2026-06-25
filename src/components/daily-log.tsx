import confetti from "canvas-confetti";
import {
  Frown,
  MoreVertical,
  Pencil,
  Plus,
  Smile,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useHabits } from "../hooks/use-habits.ts";
import { getIcon } from "../lib/icons.ts";
import { getCompletionsForHabitOnDate } from "../lib/storage.ts";
import { getRandomToastMessage } from "../lib/toast-messages.ts";
import type { Habit } from "../types.ts";
import { AddHabitSheet } from "./add-habit-sheet.tsx";
import { DateNavigation } from "./date-navigation.tsx";
import { EditHabitSheet } from "./edit-habit-sheet.tsx";
import { Button } from "./ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.tsx";

interface DailyLogProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DailyLog({ date, onDateChange }: DailyLogProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);

  const {
    habits,
    completions,
    addHabit,
    editHabit: edit,
    deleteHabit,
    addCompletion,
    undoLastCompletion,
  } = useHabits();

  function handleComplete(habitId: string) {
    addCompletion(habitId, date);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) {
      return;
    }

    const message = getRandomToastMessage(habit.type, habit.name);
    const Icon = habit.type === "good" ? Smile : Frown;

    if (habit.type === "good") {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
      });
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
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 px-4 pt-6 pb-4">
        <DateNavigation date={date} onDateChange={onDateChange} />
      </header>

      <main className="flex-1 px-4 pb-28">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/15">
              <Plus className="size-10 text-primary" />
            </div>
            <h2 className="font-bold text-2xl">Your habits start here</h2>
            <p className="mt-2 max-w-xs text-muted-foreground text-sm leading-relaxed">
              Tap the shiny + button below to add your first habit.
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {habits.map((habit) => {
              const habitCompletions = getCompletionsForHabitOnDate(
                completions,
                habit.id,
                date
              );
              const count = habitCompletions.length;
              const Icon = getIcon(habit.icon);
              return (
                <div className="relative h-full" key={habit.id}>
                  <button
                    className="flex h-full w-full flex-col items-center justify-center rounded-2xl p-5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:brightness-90"
                    onClick={() => handleComplete(habit.id)}
                    style={{
                      backgroundColor: `color-mix(in oklch, ${habit.color} 22%, white)`,
                    }}
                    type="button"
                  >
                    {count > 0 && (
                      <div
                        className="absolute top-2.5 left-2.5 flex size-6 items-center justify-center rounded-full font-bold text-white text-xs shadow-sm"
                        style={{ backgroundColor: habit.color }}
                      >
                        {habit.type === "good" ? (
                          <Smile className="size-4" />
                        ) : (
                          <Frown className="size-4" />
                        )}
                      </div>
                    )}
                    <div
                      className="mb-2 flex size-12 items-center justify-center rounded-2xl text-white transition-transform duration-150 hoverable:hover:scale-110"
                      style={{ backgroundColor: habit.color }}
                    >
                      <Icon className="size-6" />
                    </div>
                    <h3 className="font-bold text-sm leading-tight">
                      {habit.name}
                    </h3>
                    <p className="mt-0.5 font-medium text-muted-foreground text-xs">
                      {count === 0 ? (
                        <span className="italic">Not yet today</span>
                      ) : (
                        <>
                          {count} {count === 1 ? "time" : "times"}
                        </>
                      )}
                    </p>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        aria-label="More options"
                        className="absolute top-1.5 right-1.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-xl transition-all duration-150 hoverable:hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 active:bg-black/10 data-[state=open]:bg-black/10"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) =>
                          e.key === "Enter" && e.stopPropagation()
                        }
                        type="button"
                      >
                        <MoreVertical
                          className="size-5"
                          style={{ color: habit.color }}
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {count > 0 && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            undoLastCompletion(habit.id);
                          }}
                        >
                          <Undo2 className="size-4" />
                          Undo last
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditHabit(habit);
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHabit(habit.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed right-6 bottom-6 z-20">
        <Button
          className="h-16 w-16 rounded-full p-0 shadow-xl"
          onClick={() => setAddOpen(true)}
          size="xl"
          variant="default"
        >
          <Plus className="size-8" />
        </Button>
      </div>

      <AddHabitSheet
        onOpenChange={setAddOpen}
        onSave={addHabit}
        open={addOpen}
      />

      <EditHabitSheet
        habit={editHabit}
        onOpenChange={(open) => {
          if (!open) {
            setEditHabit(null);
          }
        }}
        onSave={(id, name, icon, type, color, buttonLabel) => {
          edit(id, name, icon, type, color, buttonLabel);
        }}
        open={editHabit !== null}
      />
    </div>
  );
}
