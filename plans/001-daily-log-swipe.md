# 001 — Daily log date navigation: horizontal cross-slide

- **Status**: DONE
- **Commit**: 5870992
- **Severity**: HIGH
- **Category**: Physicality & origin, Interruptibility
- **Estimated scope**: 3 files, ~350 lines total (1 new, 2 modified)

## Problem

Date navigation renders an upward stagger cascade (content fades out, remounts, cards slide up from below). The user expects a horizontal swipe that mirrors the visual metaphor of left/right navigation.

Current implementation: `src/components/daily-log.tsx:65–90` (state + effects), `src/index.css:213–225` (upward keyframe).

## Target

Old content slides off in the direction of travel, new content slides in from the opposite direction. Both versions layer simultaneously in the same spatial slot.

| Navigation | Old content | New content |
|------------|-------------|-------------|
| Next (→) | `translateX(0)` → `translateX(-100%)`, fade out | `translateX(100%)` → `translateX(0)`, fade in |
| Prev (←) | `translateX(0)` → `translateX(100%)`, fade out | `translateX(-100%)` → `translateX(0)`, fade in |

Duration: 250ms old, 300ms new. Stagger: 30ms per card.

## Architecture

Both content versions are rendered simultaneously using a `SwipeLayer` component. Keyframe animations fire on first render (the browser snapshots `from`/`to` values regardless of React render timing). Stagger cards naturally re-entrance because each layer renders its cards fresh.

## Repo conventions

- **Easing**: `cubic-bezier(0.23, 1, 0.32, 1)` — already used throughout
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` at `src/index.css:129` collapses all `animation-duration` to `0.01ms`
- **Stagger**: `--stagger-index` CSS variable with `calc()` delay — exemplar at `src/index.css:208–211`

## Steps

### Step 1 — Create `src/components/swipe-layer.tsx`

```tsx
import { useCallback, useEffect, useRef } from "react";

export interface SwipeLayerProps {
  prevContent?: React.ReactNode;
  content: React.ReactNode;
  direction?: "left" | "right";
  duration?: number;
  onRemoveOld?: () => void;
}

export function SwipeLayer({
  prevContent,
  content,
  direction,
  duration = 300,
  onRemoveOld,
}: SwipeLayerProps) {
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRemove = useCallback(() => {
    onRemoveOld?.();
  }, [onRemoveOld]);

  useEffect(() => {
    if (prevContent) {
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
      cleanupRef.current = setTimeout(handleRemove, 250);
      return () => {
        if (cleanupRef.current) clearTimeout(cleanupRef.current);
      };
    }
  }, [prevContent]);

  if (!prevContent) {
    return (
      <div className="pointer-events-auto absolute inset-0">
        {content}
      </div>
    );
  }

  return (
    <>
      {/* Previous content — slides off in direction of travel */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          animation:
            direction === "left"
              ? "swipeSlideLeftOut 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards"
              : "swipeSlideRightOut 250ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
        }}
      >
        {prevContent}
      </div>

      {/* Current content — slides in from opposite direction */}
      <div className="pointer-events-auto absolute inset-0">
        <div
          className="swipe-layer-enter"
          style={{
            animationName: "swipeEnter",
            animationDuration: `${duration}ms`,
            animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            animationFillMode: "both",
            "--slide-in-from":
              direction === "left" ? "100%" : "-100%",
          } as React.CSSProperties}
        >
          {content}
        </div>
      </div>
    </>
  );
}
```

### Step 2 — Update `src/index.css`

Remove lines 197–226 (current stagger + swipeSlideIn keyframes and classes). Replace with:

```css
/* ---- Date swipe animations ---- */

@keyframes swipeSlideRightOut {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

@keyframes swipeSlideLeftOut {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(-100%); opacity: 0; }
}

@keyframes swipeEnter {
  from { transform: translateX(var(--slide-in-from)); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

.swipe-layer-enter {
  animation: swipeEnter 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-name: swipeEnter;
}

@keyframes staggerCardEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.habit-card-stagger {
  animation: staggerCardEnter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
  animation-delay: calc(var(--stagger-index, 0) * 30ms);
}
```

Note: the stagger animation was simplified (removed `scale(0.97)` / `scale(1)`) since the swipe animation already handles the entrance feel. The stagger now just does opacity + subtle translateY.

### Step 3 — Update `src/components/daily-log.tsx`

**3a. Add import** (after line 22):

```tsx
import { SwipeLayer } from "./swipe-layer";
```

**3b. Replace state + effects block** (lines 43–90):

Replace from `export function DailyLog` through line 90 (the `useEffect` cleanup) with:

```tsx
export function DailyLog({ date, onDateChange }: DailyLogProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  const {
    habits,
    completions,
    addHabit,
    editHabit: edit,
    deleteHabit,
    addCompletion,
    undoLastCompletion,
  } = useHabits();

  const prevDirectionRef = useRef<"left" | "right" | null>(null);
  const prevDateRef = useRef(date);
  const [prevContent, setPrevContent] = useState<React.ReactNode | null>(null);
  const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Render content for a given date (used for both render and swipe)
  function renderContent(dateToRender: Date): React.ReactNode {
    if (habits.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <div className="mb-6 flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/15">
            <Plus className="size-10 text-primary" />
          </div>
          <h2 className="font-bold text-2xl">Your habits start here</h2>
          <p className="mt-2 max-w-xs text-muted-foreground text-sm leading-relaxed">
            Tap the shiny + button below to add your first habit.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-3 grid grid-cols-2 gap-3">
        {habits.map((habit, index) => {
          const habitCompletions = completionsOnDate(completions, dateToRender, habit.id);
          const count = habitCompletions.length;
          const Icon = getIcon(habit.icon);
          return (
            <div className="grid" key={`${habit.id}-${dateToRender.getTime()}`}>
              <div
                className="habit-card-stagger relative h-full"
                style={{ "--stagger-index": index } as React.CSSProperties}
              >
                <button
                  className="group habit-card flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:brightness-90"
                  onClick={() => handleComplete(habit.id)}
                  style={
                    {
                      backgroundColor: `color-mix(in oklch, ${habit.color} 22%, white)`,
                      "--card-border-color": `color-mix(in oklch, ${habit.color} 22%, white)`,
                      "--card-hover-border-color": `color-mix(in oklch, ${habit.color} 40%, white)`,
                    } as React.CSSProperties
                  }
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
                    className="mb-2 flex size-12 items-center justify-center rounded-2xl text-white transition-transform duration-150 group-hover:scale-110"
                    style={{ backgroundColor: habit.color }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-bold text-sm leading-tight">{habit.name}</h3>
                  <p className="mt-0.5 font-medium text-muted-foreground text-xs">
                    {count === 0 ? (
                      <span className="italic">Not yet today</span>
                    ) : (
                      <>{count} {count === 1 ? "time" : "times"}</>
                    )}
                  </p>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More options"
                      className="absolute top-1.5 right-1.5 z-10 flex size-8 cursor-pointer items-center justify-center rounded-xl transition-all duration-150 hoverable:hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 active:bg-black/10 data-[state=open]:bg-black/10"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.key === "Enter" && e.stopPropagation()}
                      type="button"
                    >
                      <MoreVertical className="size-5" style={{ color: habit.color }} />
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
                        setHabitToDelete(habit);
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Detect date change and trigger swipe animation
  useEffect(() => {
    if (date !== prevDateRef.current) {
      if (prevDateRef.current > date) {
        prevDirectionRef.current = "left";
      } else {
        prevDirectionRef.current = "right";
      }
      // Capture previous content for the exit animation
      setPrevContent(renderContent(prevDateRef.current));
      // Clean up old content after animation completes
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = setTimeout(() => {
        setPrevContent(null);
      }, 250);
      prevDateRef.current = date;
    }
  }, [date, habits, completions]);

  useEffect(() => {
    return () => {
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current);
    };
  }, []);
```

**3c. Replace the return JSX** (lines 168–312):

Replace the entire return block (from `<article` through the content `<div>`) with:

```tsx
  return (
    <article className="flex flex-1 flex-col overflow-hidden">
      <div className="px-4 pt-6 pb-4">
        <DateNavigation date={date} onDateChange={onDateChange} />
      </div>

      <div className="relative flex-1 overflow-hidden px-4 pb-6">
        <SwipeLayer
          prevContent={prevContent}
          content={renderContent(date)}
          direction={prevDirectionRef.current ?? undefined}
          onRemoveOld={() => {
            setPrevContent(null);
          }}
        />
      </div>
```

Keep the rest of the return (FAB button, AddHabitSheet, EditHabitSheet, Dialog) unchanged.

## Boundaries

- Do NOT touch `src/components/date-navigation.tsx` (the date button was already modified in the previous iteration — remove the `transition-all duration-150` from the date button if it's still there)
- Do NOT add new dependencies
- Do NOT change the FAB, sheets, or dialog markup
- The `renderContent()` function contains the full card rendering logic — it must be a pure function of `dateToRender` + component state

## Verification

- **Mechanical**: `npm exec -- ultracite check` passes clean, `npm run build` compiles
- **Tests**: `npm run test -- --run src/components/daily-log.test.tsx` passes all 10 tests
- **Feel check**: 
  - Tap → (next date): current cards slide left off-screen, new cards slide in from right
  - Tap ← (prev date): current cards slide right off-screen, new cards slide in from left
  - Spam-navigation mid-animation: animation reverses direction smoothly (no jarring restart)
  - In DevTools, set playback to 10% and confirm: old content moves off, new content moves on, stagger cards animate within their respective layers
  - Toggle `prefers-reduced-motion` (Rendering panel): all movement collapses, content swaps instantly
- **Done when**: All tests pass, lint clean, build succeeds, and the swipe feels like an iOS tab bar