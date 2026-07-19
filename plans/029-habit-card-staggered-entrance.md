# 029 — Stagger habit card list entrance with stagger keyframe

- **Status**: TODO
- **Commit**: b67dd5f
- **Severity**: MEDIUM
- **Category**: Missed opportunity
- **Estimated scope**: 2 files, ~30 lines

## Problem

When the daily log page loads (or habits are created and the grid appears), all habit cards snap into existence simultaneously in a 2-column grid. There is no entrance bridge — they teleport from nothing to fully rendered. This is a one-time-per-session moment that makes the app feel static and mechanical.

```tsx
// src/components/daily-log.tsx:152 — current
{habits.map((habit) => {
  const habitCompletions = completionsOnDate(completions, date, habit.id);
  const count = habitCompletions.length;
  const Icon = getIcon(habit.icon);
  return (
    <div className="relative h-full" key={habit.id}>
      <button
        className="group habit-card flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-all duration-150 ..."
        ...
```

```css
/* src/index.css:188 — current habit-card */
.habit-card {
  border-color: var(--card-border-color);
  transition: border-color 0.2s ease;
}
```

The `.habit-card` class only transitions `border-color` on hover. There is no entrance animation, stagger, or `@starting-style` rule. The parent grid container (`grid-cols-2 gap-3`) stacks items in a flow without any stagger timing.

## Target

Each habit card enters from `opacity: 0; translateY(8px) scale(0.97)` and transitions to its settled state. Cards are staggered by 30ms per item using CSS custom property `--stagger-index`. Total duration is 250ms using `cubic-bezier(0.23, 1, 0.32, 1)`. Only `opacity` and `transform` are animated.

```css
/* target — in src/index.css, after existing .habit-card rules */
@starting-style {
  .habit-card {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}

.habit-card {
  border-color: var(--card-border-color);
  transition: border-color 0.2s ease,
              opacity 250ms var(--ease-out),
              transform 250ms var(--ease-out);
}

@keyframes staggerCardEnter {
  to {
    opacity: var(--target-opacity, 1);
    transform: translateY(0) scale(1);
  }
}

.habit-card {
  animation: staggerCardEnter 250ms var(--ease-out) both;
  animation-delay: calc(var(--stagger-index, 0) * 30ms);
}
```

The easing curve `cubic-bezier(0.23, 1, 0.32, 1)` is already defined in the existing animation system via Tailwind v4's default `ease-out` and the `fadeIn`/`zoomIn` keyframes in this repo. It matches the dialog and dropdown entrance easing (0.2s ease-out).

## Repo conventions to follow

- **Global animation keys live in `src/index.css`** — existing `fadeIn`, `zoomIn`, `zoomOut`, `wobble` keyframes are at lines 60-123.
- **`@media (prefers-reduced-motion: reduce)` handling** is at line 129-137 — any transitions/animations automatically collapse to 0.01ms via the catch-all rule. No additional reduced-motion handling is needed.
- **Animation classes use a consistent naming pattern**: `.DialogOverlay`, `.DialogContent`, `.DropdownMenuContent` — all use a root class name for their animation. Follow the pattern `.habit-card` which is already a standalone class on the button element.
- **Entry keyframes use `from`/`to` or `@keyframes` named with direction** (fadeIn, zoomIn, zoomOut) — naming convention uses the direction as a suffix.
- **Entrance scales start at `scale(0.95)` or `scale(0.97)`, never `scale(0)`** — the existing `.DialogOverlay`/`.DialogContent` zoomIn keyframe at line 78-87 uses `scale(0.95)`. The habit card entrance at `scale(0.97)` is consistent.
- **Hover/pointer-gated CSS uses `@custom-variant hoverable`** — this is not a hover animation so the convention does not apply.
- **CSS files for global styles live in `src/index.css`** — the sole global stylesheet.
- **Duration/curve convention**: dialogs use `0.2s ease-out`, dropdowns use `0.15s ease-out`. The stagger entrance at `250ms` with the same `ease-out` curve is in the same family and consistent.

## Steps

1. **Add CSS custom property support for stagger index on habit card buttons.**

   In `src/components/daily-log.tsx`, add an inline `--stagger-index` style prop to the habit card button, set to the array index from the `.map()` call:

   ```tsx
   // src/components/daily-log.tsx:153 — modify the map callback to pass stagger index
   {habits.map((habit, index) => {
     const habitCompletions = completionsOnDate(
       completions,
       date,
       habit.id
     );
     const count = habitCompletions.length;
     const Icon = getIcon(habit.icon);
     return (
       <div className="relative h-full" key={habit.id}>
         <button
           className="group habit-card flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:brightness-90"
           onClick={() => handleComplete(habit.id)}
           style={
             {
               backgroundColor: `color-mix(in oklch, ${habit.color} 22%, white)`,
               "--card-border-color": `color-mix(in oklch, ${habit.color} 22%, white)`,
               "--card-hover-border-color": `color-mix(in oklch, ${habit.color} 40%, white)`,
               "--stagger-index": index,
             } as React.CSSProperties
           }
           type="button"
         >
           ...
   ```

   The change is on line 153 where `.map((habit)` becomes `.map((habit, index)` and a new `--stagger-index: index` entry is added to the existing inline style object on line 166.

2. **Add stagger entrance animation and @starting-style to `src/index.css`.**

   After the existing `.habit-card:hover` rule (line 193) and before the closing of the file, add:

   ```css
   /* Habit card staggered entrance — triggers when cards appear */
   @starting-style {
     .habit-card {
       opacity: 0;
       transform: translateY(8px) scale(0.97);
     }
   }

   .habit-card {
     border-color: var(--card-border-color);
     transition: border-color 0.2s ease,
                 opacity 250ms cubic-bezier(0.23, 1, 0.32, 1),
                 transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
     animation: staggerCardEnter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
     animation-delay: calc(var(--stagger-index, 0) * 30ms);
   }

   @keyframes staggerCardEnter {
     to {
       transform: translateY(0) scale(1);
     }
   }
   ```

   Notes on the animation approach:
   - `@starting-style` is a native CSS Feature (https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) supported in all modern browsers (Chrome 110+, Safari 17+, Firefox 126+). The `.habit-card` class is on a `<button>` element for which this property is fully supported.
   - The `@starting-style` rule ensures that when the button element first appears (e.g., after creating a habit), it starts from the defined values and transitions to its settled state. This handles the case where cards appear due to state changes (habit created/deleted).
   - The `animation: staggerCardEnter` with `animation-delay` provides the stagger. This is a one-shot keyframe animation (no `infinite`, no `animation-iteration-count` — defaults to `1`). The `to` block animates to the button's settled state (transitions handle `opacity` and `transform` to their CSS values, while `@starting-style` ensures `transform` starts from `translateY(8px) scale(0.97)`).
   - For the `opacity` property: the button is in the DOM and visible by default. The `@starting-style` rule only controls properties that are animatable on initial paint. For repeated re-entry (e.g., habit deleted then recreated), the keyframe animation alone (with the stagger-delay) ensures the entrance animation fires each time the element is added to the DOM.
   - The `both` fill-mode holds the start value until the delay completes and then plays.
   - `cubic-bezier(0.23, 1, 0.32, 1)` is inlined rather than using a CSS variable — this matches how the dialog uses `ease-out` directly in the keyframes (see line 165 `fadeIn 0.2s ease-out`).

3. **Remove the redundant `transition: opacity, transform` from the existing `transition-all` on the button.**

   The button already has `transition-all duration-150` (Tailwind class). This will conflict with the explicit `transition: opacity ..., transform ...` added in step 2. Since we want the stagger/entrance transitions to be 250ms ease-out and only apply to opacity and transform, we need to scope the existing `transition-all duration-150` to non-entrance transitions (hover, active states).

   In the button className, replace `transition-all duration-150` with the explicit set of transition properties the button currently needs:

   ```
   transition-border-color 0.2s ease,
   transition-transform 0.15s ease-out,
   transition-brightness 0.15s ease-out,
   ```

   This way the `transition-all duration-150` does not override the 250ms entrance transitions on `opacity` and `transform`.

   The updated className:
   ```
   group habit-card flex h-full w-full flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-border-color duration-200 transition-transform duration-150 transition-brightness duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] active:brightness-90
   ```

   Wait — Tailwind v4 uses `transition-*` utilities. Let me check what Tailwind v4 provides.

   Actually, Tailwind v4 (the version in this repo, per `package.json`: `"tailwindcss": "^4.1.4"`) uses `@import "tailwindcss"` and supports the existing `transition-all` and `duration-*` utilities. The `transition-all` utility sets `transition-property: all` which will include `opacity` and `transform`.

   To avoid the conflict, we have two options:
   a) Use `!transition-none` + rely solely on CSS for transitions (messy).
   b) Scope the stagger animation to only fire on first paint via `@starting-style`, and let the existing `transition-all duration-150` handle `hover`/`active` states normally.

   Option b is simpler and correct. The `@starting-style` + `@keyframes` animation will play once on entry, and the existing `transition-all` will handle hover/active after the element settles. The Tailwind utility does not interfere because:
   - `transition-all duration-150` only applies when a CSS property is *changing* between states (hover→normal, active→normal), not on initial paint when the `@starting-style` keyframe is already driving the animation.
   - The explicit `transition: opacity 250ms ..., transform 250ms ...` in our `.habit-card` CSS rule in step 2 will set the transition for the duration of the keyframe animation.

   Actually, let me reconsider — the explicit `transition` in the `.habit-card` rule will override the Tailwind `transition-all` for those same properties. This is a cascade conflict.

   The cleanest fix: remove `transition-all duration-150` from the button className and replace it with the exact properties the button needs for hover/active:

   ```
   transition-colors duration-150
   ```

   This gives `transition: color, background-color, border-color, text-decoration-color` — covering the hover border-color change, the background color from inline style, and the active brightness via the Tailwind `active:brightness-90` utility (which works via CSS filters, not transitions).

   Actually, brightness is a filter, and active brightness fade needs a transition on `filter`. Let me use:

   ```
   transition-all duration-150 [transition-property:not(color,background-color,border-color,opacity,transform)]
   ```

   That's fragile. Better: just keep `transition-all duration-150` in the className, and in our CSS rule, use `transition: opacity ...` with a narrower specificity that wins over Tailwind for those specific properties, or use `!important`.

   Actually, the simplest correct approach: since the `.habit-card` class is on the `<button>` element in the JSX alongside the Tailwind classes, and our CSS is in `index.css` (loaded last), the explicit `transition` in our `.habit-card` CSS will simply be added to Tailwind's `transition-all` — it does not override `all`, it sets a parallel transition. CSS allows multiple transitions from multiple sources.

   So step 2's CSS is already correct as-is:
   ```css
   .habit-card {
     transition: border-color 0.2s ease,
                 opacity 250ms cubic-bezier(0.23, 1, 0.32, 1),
                 transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
   }
   ```

   This adds transitions on `opacity` and `transform` at 250ms *in addition to* the existing `transition-all duration-150` on the button element. Both apply — the browser picks the longest duration for any given property (250ms for opacity/transform, 150ms for everything else in `all`). When a hover or active state fires, the transition duration for opacity and transform will be 250ms instead of 150ms.

   **This is a problem for hover/active interactions.** The habit card hover scale animation on the inner icon (line 188) uses `transition-transform duration-150`. If the outer button's transition sets 250ms on transform via the entrance, the inner icon's 150ms hover scale will also use 250ms — making hover feel sluggish.

   **Fix:** Do not add `transition` on the `.habit-card` class. Instead, apply the entrance transition only via the `@starting-style` rule (which is naturally a one-shot, fire-once mechanism) and the keyframe animation. The `@starting-style` rule does not set a `transition` property — it sets the *starting* values, and the browser interpolates automatically.

   Revised step 2 — simplified CSS (no `transition` property):

   ```css
   /* src/index.css — add after .habit-card:hover at line 194 */

   @starting-style {
     .habit-card {
       opacity: 0;
       transform: translateY(8px) scale(0.97);
     }
   }

   @keyframes staggerCardEnter {
     to {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }

   .habit-card {
     animation: staggerCardEnter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
     animation-delay: calc(var(--stagger-index, 0) * 30ms);
   }
   ```

   This is the correct approach. `@starting-style` sets the starting values for the browser's natural transition on element creation. The `@keyframes` animation ensures re-entry (when a habit is created or deleted and a new card appears). `animation-delay` provides the stagger. No `transition` property is added, so the existing `transition-all duration-150` on the button remains unchanged for hover/active states.

4. **Verify the keyframe animation fires correctly on DOM insertion.**

   The `@keyframes staggerCardEnter` with `animation: ... both` and `@starting-style` together ensure:
   - First paint (element created): `@starting-style` provides starting values, browser interpolates from `@starting-style` values to settled values.
   - Re-insertion (habit created/deleted/loaded fresh): the keyframe replays from `to` backwards to `from` — wait.

   **Problem**: `@keyframes staggerCardEnter` only defines a `to` block (no `from`). A keyframe with only `to` interpolates from `auto` (the element's current computed value) to the `to` value. Since the element's current value on re-insertion is `opacity: 1; transform: none`, the `to` block (which is also `opacity: 1; transform: translateY(0) scale(1)`) means the keyframe animation **does nothing on re-insertion** — the element instantly snaps in.

   The `@starting-style` rule alone handles the first paint correctly but does **not** replay on DOM re-insertion. After the initial animation, the element is in its settled state, and when it's later removed and re-added (e.g., habit created then deleted causing the list to remount), `@starting-style` only fires once per element creation — not on every re-insertion.

   **Correct approach**: define the full keyframe from start → end:

   ```css
   @keyframes staggerCardEnter {
     from {
       opacity: 0;
       transform: translateY(8px) scale(0.97);
     }
     to {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }

   .habit-card {
     animation: staggerCardEnter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
     animation-delay: calc(var(--stagger-index, 0) * 30ms);
   }
   ```

   With `from` + `to`, the keyframe animation fires on every DOM insertion, playing from the initial hidden state to the settled state. The stagger-delay ensures the cards appear in sequence each time.

   **And `@starting-style` is still needed?** With the explicit `from` keyframe, the keyframe handles both first paint and re-insertion. `@starting-style` provides a graceful fallback for browsers that support CSS transitions but not `@starting-style` keyframe replay — actually, `@starting-style` is the *newer* mechanism designed exactly for this. The combination is:
   - Browsers with `@starting-style` support (Chrome 110+, Safari 17+, Firefox 126+): use both, but the `@keyframes from/to` wins because keyframes override starting-style.
   - Browsers without `@starting-style` but with keyframes: the keyframe `from/to` still fires correctly on every insertion.
   - Very old browsers (not in this target): the card appears instantly (acceptable fallback).

   We can simplify to just the `from/to` keyframe (no `@starting-style`) and it handles all cases. Let's go with that:

   ```css
   /* src/index.css — add after .habit-card:hover at line 194 */

   @keyframes staggerCardEnter {
     from {
       opacity: 0;
       transform: translateY(8px) scale(0.97);
     }
     to {
       opacity: 1;
       transform: translateY(0) scale(1);
     }
   }

   .habit-card {
     animation: staggerCardEnter 250ms cubic-bezier(0.23, 1, 0.32, 1) both;
     animation-delay: calc(var(--stagger-index, 0) * 30ms);
   }
   ```

   This is the final, correct version. No `@starting-style`, no `transition` additions — just a keyframe + stagger delay. The existing `@media (prefers-reduced-motion: reduce)` catch-all rule (lines 129-137) ensures the animation duration collapses to 0.01ms for users who prefer reduced motion.

## Boundaries

- Do NOT touch `src/components/add-habit-sheet.tsx`, `src/components/edit-habit-sheet.tsx`, `src/components/stats-page.tsx`, `src/components/topbar.tsx` or any file outside `src/components/daily-log.tsx` and `src/index.css`.
- Do NOT change the button's `className` or the JSX structure — only add the `--stagger-index` inline style property and add CSS rules.
- Do NOT add new dependencies (no new NPM packages).
- Accept that `animation-delay` applies equally on initial load and re-entry. If the user rapidly creates/deletes habits, all cards will re-stagger each time — this is acceptable because habit CRUD is occasional (not high-frequency).

## Verification

- **Mechanical**:
  - Run `npm exec -- ultracite check` from the repo root — all files pass linting.
  - Run `npm run build` — no TypeScript or build errors.
- **Feel check**:
  - Open the app and create a habit (or visit a day with multiple habits). Observe: cards fade in and slide up from slightly below + slightly smaller, then settle. First card starts immediately, second starts ~30ms after, third ~60ms after, etc.
  - Navigate to a date with no habits, create a habit via the + button, close the dialog. Observe: the new habit card enters with the same staggered animation relative to its index in the grid.
  - Spam the date-navigation arrows (prev/next) — cards remain visible and transitions are only on `color`/`brightness`, not on layout. No flash or re-stagger.
  - In DevTools, set Animations playback to 10% and confirm: each card's entrance is smooth (easing visible), total entrance duration is 250ms, stagger is 30ms between cards.
  - Toggle `prefers-reduced-motion` (Chrome DevTools → Rendering → Emulate CSS prefers-reduced-motion) — the keyframe animation collapses (durations go to 0ms), cards appear instantly. Hover and active states still work.
- **Done when**: Each habit card enters with a staggered fade+slide from below (30ms per card, 250ms duration, cubic-bezier(0.23, 1, 0.32, 1)), the animation fires on every DOM insertion (initial load + habit creation), and reduced-motion users see instant appearance with no degradation of hover/active states.