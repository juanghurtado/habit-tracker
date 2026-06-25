import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button.tsx";

interface DateNavigationProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigation({ date, onDateChange }: DateNavigationProps) {
  const today = new Date();
  const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  return (
    <div className="flex items-center justify-between px-2">
      <Button
        aria-label="Previous day"
        onClick={() => onDateChange(subDays(date, 1))}
        size="icon"
        variant="ghost"
      >
        <ChevronLeft className="size-6" />
      </Button>
      <button
        className="cursor-pointer select-none rounded-xl px-3 py-1 text-center transition-all duration-150 hoverable:hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
        onClick={() => onDateChange(today)}
      >
        <p className="font-medium text-muted-foreground text-sm">
          {format(date, "EEEE")}
        </p>
        <p className="font-bold text-2xl">
          {isToday ? "Today" : format(date, "MMM d")}
        </p>
      </button>
      <Button
        aria-label="Next day"
        disabled={isToday}
        onClick={() => onDateChange(addDays(date, 1))}
        size="icon"
        variant="ghost"
      >
        <ChevronRight className="size-6" />
      </Button>
    </div>
  );
}
