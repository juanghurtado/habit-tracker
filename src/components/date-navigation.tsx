import * as React from "react"
import { format, addDays, subDays } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"

interface DateNavigationProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function DateNavigation({ date, onDateChange }: DateNavigationProps) {
  const today = new Date()
  const isToday =
    format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")

  return (
    <div className="flex items-center justify-between px-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(subDays(date, 1))}
        aria-label="Previous day"
      >
        <ChevronLeft className="size-6" />
      </Button>
      <button
        onClick={() => onDateChange(today)}
        className="rounded-xl px-3 py-1 text-center transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hoverable:hover:bg-muted cursor-pointer select-none"
      >
        <p className="text-sm font-medium text-muted-foreground">
          {format(date, "EEEE")}
        </p>
        <p className="text-2xl font-bold">
          {isToday ? "Today" : format(date, "MMM d")}
        </p>
      </button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDateChange(addDays(date, 1))}
        disabled={isToday}
        aria-label="Next day"
      >
        <ChevronRight className="size-6" />
      </Button>
    </div>
  )
}